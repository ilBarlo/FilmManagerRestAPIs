'use strict';

const utils = require('../utils/writer.js');
const constants = require('../utils/constants.js');
const Drafts = require('../service/DraftsService.js');
const Reviews = require('../service/ReviewsService.js')


exports.createDraft = async function (req, res) {
  let conflict = false;
  const draft = req.body;
  if (draft.reviewId != req.params.reviewId) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewId field of the draft object is different from the reviewId path parameter.' }], }, 403);
    return;
  } else if (draft.userId !== req.user.id) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The userId field of the draft object is different from the logged user id.' }], }, 403);
    return;
  }
  await Drafts.getNumberOfOpenedOrInProgressDraft(req.params.reviewId)
    .then(openedOrInProgressDrafts => {
      if (openedOrInProgressDrafts > 0) {
        conflict = true;
      }
    }).catch(err => utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500));
  if (conflict) {
    await Drafts.getStatusOfOpenedOrInProgressDraft(req.params.reviewId)
    .then(status => {
      if (status === 'COMPLETED') utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Draft for this review is already completed' }], }, 409);
      else if (status === 'IN_PROGRESS') utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Another draft is currently in progress' }], }, 409);
    }).catch(err => utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500));
    
    return;
  }
  Reviews.getReviewAssigneeId(req.params.reviewId, req.params.filmId)
    .then(ids => {
      if (ids.includes(req.user.id)) {
        if (ids.length == 1) {
          Drafts.createDraft(draft.reviewId, draft.rating, draft.review, draft.userId, constants.COMPLETED, req.params.filmId)
            .then(draft => {
              Reviews.updateSingleReview(draft, draft.reviewId, 0)
                .then(_ => {
                  utils.writeJson(res, draft);
                })
                .catch(err => {
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
                })
            })
            .catch(err => {
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
            });
        } else {
          Drafts.createDraft(draft.reviewId, draft.rating, draft.review, draft.userId, constants.IN_PROGRESS, req.params.filmId)
            .then(draft => {
              utils.writeJson(res, draft, 201);
            })
            .catch(err => {
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
            });
        }
      } else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not assignee for this review' }], }, 403);
      }
    })
    .catch(err => {
      if (err === '404') {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not found' }], }, 404);
      } else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
      }
    });
}

exports.getDraftsByReview = function (req, res) {

  var numOfDrafts = 0;
  var next = 0;

  Drafts.getReviewsDraftTotal(req.params.reviewId)
    .then(function (response) {

      numOfDrafts = response;
      Reviews.getReviewAssigneeId(req.params.reviewId, req.params.filmId)
        .then(ids => {
          if (ids.includes(req.user.id)) {

            Drafts.getDraftsByReview(req)
              .then(drafts => {
                
                if (req.query.pageNo == null) var pageNo = 1;
                else var pageNo = req.query.pageNo;
                var totalPage = Math.ceil(numOfDrafts / constants.OFFSET);
                next = Number(pageNo) + 1;
                if (pageNo > totalPage) {
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                } else if (pageNo == totalPage) {
                  utils.writeJson(res, {
                    totalPages: totalPage,
                    currentPage: pageNo,
                    totalItems: numOfDrafts,
                    drafts: drafts
                  });
                } else {
                  utils.writeJson(res, {
                    totalPages: totalPage,
                    currentPage: pageNo,
                    totalItems: numOfDrafts,
                    drafts: drafts,
                    next: "/api/films/public/" + req.params.filmId + "/reviews/" + req.params.reviewId + "/drafts" + "?pageNo=" + next
                  });
                }
              })
              .catch(err => {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
              });
          } else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not assignee for this review' }], }, 403);
          }
        })
        .catch(err => {
          if (err === '404') {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not found' }], }, 404);
          } else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
          }
        });
    })
    .catch(function (response) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
    });
}

exports.getDraftById = function (req, res) {
  Reviews.getReviewAssigneeId(req.params.reviewId, req.params.filmId)
    .then(ids => {
      if (ids.includes(req.user.id)) {
        Drafts.getDraftById(req.params.draftId, req.params.filmId)
          .then(draft => {
            utils.writeJson(res, draft)
          })
          .catch(err => {
            if (err === '404') {
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Draft not found' }], }, 404);
            } else {
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
            }
          })
      }
    })
    .catch(err => {
      if (err === '404') {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not found' }], }, 404);
      } else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
      }
    });
}