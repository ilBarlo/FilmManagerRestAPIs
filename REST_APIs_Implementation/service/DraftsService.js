'use strict';

const Draft = require('../components/draft');
const db = require('../components/db');
var constants = require('../utils/constants.js');

exports.createDraft = function (reviewId, rating, review, userId, status, filmId) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO drafts (reviewId, rating, review, userId, status) VALUES (?,?,?,?,?)';
    db.run(sql, [reviewId, rating, review, userId, status], function (err) {
      if (err) {
        reject('err');
      } else {
        const draft = new Draft(this.lastID, reviewId, rating, review, userId, status, filmId);
        resolve(draft);
      }
    });
  });
}

exports.getDraftsByReview = function (req) {
  return new Promise((resolve, reject) => {
    var sql = "SELECT d.id, d.reviewId, d.rating, d.review, d.userId, d.status, c.total_rows FROM drafts d, (SELECT count(*) total_rows FROM drafts l WHERE l.reviewId = ? ) c WHERE d.reviewId = ?";
    var params = getPagination(req);
    if (params.length != 2) sql = sql + " LIMIT ?,?";
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(null);
      } else {
        const drafts = rows.map(row => new Draft(row.id, row.reviewId, row.rating, row.review, row.userId, row.status, req.params.filmId));
        resolve(drafts);
      }
    })
  })
}

exports.getDraftById = function (draftId, filmId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM drafts WHERE id = ?';
    db.get(sql, [draftId], (err, row) => {
      if (err) {
        reject('500');
      } else if (row === undefined) {
        reject('404')
      } else {
        const draft = new Draft(row.id, row.reviewId, row.rating, row.review, row.userId, row.status, filmId);
        resolve(draft)
      }
    });
  });
}

exports.getNumberOfOpenedOrInProgressDraft = function (reviewId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT COUNT(*) as num_drafts FROM drafts WHERE reviewId = ? AND status != 'REJECTED'";
    db.get(sql, [reviewId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.num_drafts);
      }
    });
  })
}

exports.getStatusOfOpenedOrInProgressDraft = function (reviewId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT status FROM drafts WHERE reviewId = ? AND status != 'REJECTED'";
    db.get(sql, [reviewId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.status);
      }
    });
  })
}

exports.updateDraftStatus = function (draftId, status) {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE drafts SET status = ? WHERE id = ?";
    db.run(sql, [status, draftId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(null);
      }
    })
  });
}

exports.isUserOwner = function (userId, draftId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM drafts where id = ? AND userId = ?";
    db.get(sql, [draftId, userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row !== undefined)
      }
    })
  });
}

exports.getReviewsDraftTotal = function (reviewId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfDrafts = "SELECT count(*) total FROM drafts WHERE reviewId = ? ";
      db.get(sqlNumOfDrafts, [reviewId], (err, size) => {
          if (err) {
              reject(err);
          } else {
              resolve(size.total);
          }
      });
  });
}

exports.checkReviewIDDraft = function (reviewId, draftId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfDrafts = "SELECT count(*) total FROM drafts WHERE reviewId = ? and id = ?";
      db.get(sqlNumOfDrafts, [reviewId, draftId], (err, size) => {
          if (err) {
              reject(err);
          } else {
              resolve(size.total);
          }
      });
  });
}


/**
 * Utility functions
 */
const getPagination = function (req) {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(constants.OFFSET);
  var limits = [];
  limits.push(req.params.reviewId);
  limits.push(req.params.reviewId);
  if (req.query.pageNo == null) {
      pageNo = 1;
  }
  limits.push(size * (pageNo - 1));
  limits.push(size);
  return limits;
}