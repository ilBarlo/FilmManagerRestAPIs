'use strict';

const Vote = require('../components/vote');
const db = require('../components/db');
var constants = require('../utils/constants.js');

exports.createVote = function (vote, filmId, reviewId, draftId) {
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO votes (agree, description, draftId, userId) VALUES (?,?,?,?)";
    db.run(sql, [vote.agree, vote.description, vote.draftId, vote.userId], function (err) {
      if (err) {
        reject(err);
      } else {
        const v = new Vote(this.lastID, vote.userId, vote.agree, vote.description, filmId, reviewId, draftId);
        resolve(v);
      }
    });
  });
}

exports.getVotesByDraft = function (req) {
  return new Promise((resolve, reject) => {
    var sql = "SELECT v.id, v.agree, v.description, v.draftId, v.userId, c.total_rows FROM votes v, drafts d, (SELECT count(*) total_rows FROM votes l WHERE l.draftId = ? ) c WHERE v.draftId = d.id AND v.draftId = ? AND d.reviewId = ?";

    var params = getPagination(req);
    if (params.length != 2) sql = sql + " LIMIT ?,?";

    db.all(sql,  params, (err, rows) => {
      if (err) {
        console.log(err);
        reject(err)
      } else {
        const votes = rows.map(row => new Vote(row.id, row.userId, row.agree, row.description, req.params.filmId, req.params.reviewId, row.draftId));
        resolve(votes);
      }
    });
  });
}

exports.getVoteById = function (voteId, draftId, filmId, reviewId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT v.id, v.agree, v.description, v.draftId, v.userId FROM votes v, drafts d WHERE v.draftId = d.id AND v.id = ? and v.draftId = ? and d.reviewId = ?";
    db.get(sql, [voteId, draftId, reviewId], function(err, row) {
      if (err) {
        console.log(err);
        reject(err);
      } else if (!row) {
        reject('404');
      } else {
        const vote = new Vote(row.id, row.userId, row.agree, row.description, filmId, reviewId, draftId);
        resolve(vote);
      }
    })
  })
}

exports.getTotalVotesByUserAndDraft = function (userId, draftId, reviewId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT COUNT(*) as num_votes FROM votes v, drafts d WHERE v.draftId = d.id AND v.userId = ? AND v.draftId = ? and d.reviewId = ?";
    db.get(sql, [userId, draftId, reviewId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.num_votes);
      }
    });
  });
}

exports.getDraftVotestTotal = function (draftId, reviewId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfDrafts = "SELECT count(*) total FROM votes v, drafts d WHERE v.draftId = d.id AND v.draftId = ? and d.reviewId = ?";
      db.get(sqlNumOfDrafts, [draftId, reviewId], (err, size) => {
          if (err) {
            console.log(err);
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
  limits.push(req.params.draftId);
  limits.push(req.params.draftId);
  limits.push(req.params.reviewId);
  if (req.query.pageNo == null) {
      pageNo = 1;
  }
  limits.push(size * (pageNo - 1));
  limits.push(size);
  return limits;
}