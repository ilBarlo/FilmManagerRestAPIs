'use strict';

const utils = require('../utils/writer.js');
const constants = require('../utils/constants.js');
const Votes = require('../service/VoteService.js');
const Reviews = require('../service/ReviewsService.js');
const Drafts = require('../service/DraftsService.js');

exports.createVote = async function (req, res) {
  const vote = req.body;
  if (vote.userId != req.user.id) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The userId field of the vote object is different from the userId of the caller.' }], }, 403);
    return;
  }
  if (vote.draftId != req.params.draftId) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The draftId field of the vote object is different from the draftId path parameter.' }], }, 403);
    return;
  }
  try {
    const userIsOwner = await Drafts.isUserOwner(req.user.id, req.params.draftId);
    if (userIsOwner) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The owner of a draft can\'t vote.' }], }, 403);
      return;
    }
  } catch (err) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500)
  }

  const checkId = await  Drafts.checkReviewIDDraft(req.params.reviewId, req.params.draftId);
  if (checkId === 0){
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not found' }], }, 404);
    return;
  }
  
  Reviews.getReviewAssigneeId(req.params.reviewId, req.params.filmId)
    .then(ids => {
      if (!ids.includes(req.user.id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not assignee for this review' }], }, 403);
        return;
      }
      Votes.getTotalVotesByUserAndDraft(req.user.id, req.params.draftId, req.params.reviewId)
        .then(totalUserVotes => {
          if (totalUserVotes > 0) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user has already voted' }], }, 409);
          } else {
            Votes.createVote(vote, req.params.filmId, req.params.reviewId, req.params.draftId)
              .then(vote => {
                checkDraft(ids, req.params.draftId, req.params.reviewId, req)
                  .catch(err => {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500)
                  })
                  .then(_ => {
                    utils.writeJson(res, vote, 201)
                  });
              }).catch(err => utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500));
          }
        }).catch(err => utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500));
    })
    .catch(err => {
      if (err === '404') {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not found' }], }, 404);
      } else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
      }
    });
}

exports.getVotesByDraft = function (req, res) {
  Reviews.getReviewAssigneeId(req.params.reviewId, req.params.filmId)
    .then(ids => {
      if (!ids.includes(req.user.id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not assignee for this review' }], }, 403);
        return;
      }

      var numOfVotes = 0;
      var next = 0;

      Votes.getDraftVotestTotal(req.params.draftId, req.params.reviewId)
        .then(function (response) {

          numOfVotes = response;
          Votes.getVotesByDraft(req)
            .then(votes => {
              if (req.query.pageNo == null) var pageNo = 1;
              else var pageNo = req.query.pageNo;
              var totalPage = Math.ceil(numOfVotes / constants.OFFSET);
              next = Number(pageNo) + 1;
              if (pageNo > totalPage) {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
              } else if (pageNo == totalPage) {
                utils.writeJson(res, {
                  totalPages: totalPage,
                  currentPage: pageNo,
                  totalItems: numOfVotes,
                  votes: votes
                });
              } else {
                utils.writeJson(res, {
                  totalPages: totalPage,
                  currentPage: pageNo,
                  totalItems: numOfVotes,
                  votes: votes,
                  next: "/api/films/public/" + req.params.filmId + "/reviews/" + req.params.reviewId + "/drafts/" + req.params.draftId + "/votes" + "?pageNo=" + next
                });
              }
            })
            .catch(err => utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500));
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
      if (response === '404') utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Vote not found' }], }, 404);
      else utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
    });
}

exports.getVoteById = function (req, res) {
  Reviews.getReviewAssigneeId(req.params.reviewId, req.params.filmId)
    .then(ids => {
      if (!ids.includes(req.user.id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not assignee for this review' }], }, 403);
        return;
      }
      Votes.getVoteById(req.params.voteId, req.params.draftId, req.params.filmId, req.params.reviewId)
        .then(vote => {
          utils.writeJson(res, vote)
        })
        .catch(err => {
          if (err === '404') {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Vote not found' }], }, 404);
          } else {
            utils.writeJson(res, { errors: [{ 'param': 'Server ciaoo', 'msg': err }], }, 500);
          }
        });
    })
    .catch(err => {
      if (err === '404') {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Review not found' }], }, 404);
      } else {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': err }], }, 500);
      }
    });
}

const checkDraft = async (ids, draftId, reviewId, req) => {
  const votes = await Votes.getVotesByDraft(req);
  if (votes.length === (ids.length - 1)) {
    const isRejected = votes.some(vote_1 => !vote_1.agree);
    if (!isRejected) {
      Drafts.getDraftById(draftId)
        .then(draft => {
          Reviews.updateSingleReview(draft, reviewId, 1); /* 1 to check that is a cooperative review */
        }).catch(err => err)
    }
    Drafts.updateDraftStatus(draftId, isRejected ? constants.REJECTED : constants.COMPLETED)
      .catch(err => err);
  }
}