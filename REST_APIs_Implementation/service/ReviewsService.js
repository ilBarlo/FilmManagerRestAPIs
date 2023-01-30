'use strict';

const Review = require('../components/review');
const User = require('../components/user');
const db = require('../components/db');
var constants = require('../utils/constants.js');

/**
 * Retrieve the reviews of the film with ID filmId
 * 
 * Input: 
 * - req: the request of the user
 * Output:
 * - list of the reviews
 * 
 **/
exports.getFilmReviews = function (req) {
    return new Promise((resolve, reject) => {
        var sql = "SELECT r.id, r.filmId as fid, r.completed, r.reviewDate, r.rating, r.review, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? ) c WHERE r.filmId = ?";
        var params = getPagination(req);
        if (params.length != 2) sql = sql + " LIMIT ?,?";
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let reviews = rows.map((row) => createReview(row));
                resolve(reviews);
            }
        });
    });
}

/**
 * Retrieve the number of reviews of the film with ID filmId
 * 
 * Input: 
* - filmId: the ID of the film whose reviews need to be retrieved
 * Output:
 * - total number of reviews of the film with ID filmId
 * 
 **/
exports.getFilmReviewsTotal = function (filmId) {
    return new Promise((resolve, reject) => {
        var sqlNumOfReviews = "SELECT count(*) total FROM reviews WHERE filmId = ? ";
        db.get(sqlNumOfReviews, [filmId], (err, size) => {
            if (err) {
                reject(err);
            } else {
                resolve(size.total);
            }
        });
    });
}

/**
 * Retrieve the review of the film having filmId as ID and issued to user with reviewerId as ID
 *
 * Input: 
 * - filmId: the ID of the film whose review needs to be retrieved
 * - reviewerId: the ID ot the reviewer
 * Output:
 * - the requested review
 * 
 **/
exports.getSingleReview = function (filmId, reviewerId) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT r.id, r.filmId as fid, ru.reviewerId as rid, r.completed, r.reviewDate, r.rating, r.review FROM reviews r, reviews_users ru WHERE r.filmId = ? AND r.id = ? AND r.id = ru.reviewId"
        db.all(sql, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else {
                var review = createReview(rows[0]);
                resolve(review);
            }
        });
    });
}

/**
 * Delete a review invitation
 *
 * Input: 
 * - filmId: ID of the film
 * - reviewerId: ID of the reviewer
 * - owner : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.deleteSingleReview = function (filmId, reviewId, owner) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT f.owner, r.completed FROM films f, reviews r WHERE f.id = r.filmId AND f.id = ? AND r.id = ?";
        db.all(sql1, [filmId, reviewId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if (owner != rows[0].owner) {
                reject("403A");
            }
            else if (rows[0].completed == 1) {
                reject("403B");
            }
            else {
                const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND id = ?';
                db.run(sql2, [filmId, reviewId], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(null);
                })
            }
        });
    });

}

/**
 * Issue a film review to a user
 *
 *
 * Input: 
 * - reviewerId : ID of the film reviewer
 * - filmId: ID of the film 
 * - owner: ID of the user who wants to issue the review
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.issueFilmReview = function (invitations, owner) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT owner, private FROM films WHERE id = ?";
        db.all(sql1, [invitations[0].filmId], (err, rows) => {
            if (err) {
                reject(err);
            }
            else if (rows.length === 0) {
                reject(404);
            }
            else if (owner != rows[0].owner) {
                reject('403A');
            } else if (rows[0].private == 1) {
                reject(404);
            }
            else {
                var sql2 = 'SELECT * FROM users';
                var invitedUsers = [];
                for (var i = 0; i < invitations.length; i++) {
                    if (i == 0) sql2 += ' WHERE id = ?';
                    else sql2 += ' OR id = ?'
                    invitedUsers[i] = invitations[i].reviewerId;
                }
                db.all(sql2, invitedUsers, async function (err, rows) {
                    if (err) {
                        reject(err);
                    }
                    else if (rows.length !== invitations.length) {
                        reject(409);
                    }
                    else {
                        let review;
                        try {
                            review = await issueSingleReview(invitations[0].filmId, invitations.length > 1, invitations[0].reviewerId);
                        } catch (error) {
                            if (error === '500') reject('Error in the creation of the review data structure');
                            else if (error === '403B') {
                                reject('403B');
                            }
                            return;
                        }

                        const sql4 = 'INSERT INTO reviews_users(reviewId, reviewerId) VALUES(?,?)';
                        for (const invitation of invitations) {
                            try {
                                await insertReviewer(sql4, review.id, invitation.reviewerId)
                            } catch (error) {
                                reject('Error during assigning reviewer to review');
                                return;
                            }
                        }

                        resolve(review)
                    }
                });
            }
        });
    });
}

exports.getReviewAssigneeId = function (reviewId, filmId) {
    return new Promise((resolve, reject) => {
        db.all('SELECT rs.reviewerId as rid FROM reviews_users rs, reviews r WHERE r.id = rs.reviewId AND rs.reviewId = ? AND r.filmId = ?', [reviewId, filmId], function (err, rows) {
            if (err) {
                console.log(err);
                reject('500');
            } else if (rows.length == 0) {
                console.log(rows)
                reject('404');
            }
            else {
                resolve(rows.map(row => row.rid));
            }
        });
    });
}

const issueSingleReview = function (filmId, isCoop, reviewerId) {
    const sql1 = "SELECT * FROM reviews r, reviews_users rs WHERE r.id = rs.reviewId AND r.filmId=? AND coop=0 AND rs.reviewerId = ?";
    const sql = 'INSERT INTO reviews(filmId, completed, coop) VALUES(?,0,?)';
    return new Promise((resolve, reject) => {
        if (!isCoop) {
            db.all(sql1, [filmId, reviewerId], (err, rows) => {
                if (err) {
                    console.log(err);
                    reject('500');
                    return;
                } else if (rows.length !== 0) {
                    reject('403B');
                    return;
                } else {
                    db.run(sql, [filmId, isCoop], function (err) {
                        if (err) {
                            reject('500');
                        } else {
                            const createdReview = new Review(this.lastID, filmId, false);
                            resolve(createdReview);
                        }
                    });
                }
            });
        } else {
            db.run(sql, [filmId, isCoop], function (err) {
                if (err) {
                    reject('500');
                } else {
                    const createdReview = new Review(this.lastID, filmId, false);
                    resolve(createdReview);
                }
            });
        }
    })
}

const insertReviewer = function (sql, reviewId, reviewerId) {
    return new Promise((resolve, reject) => {
        db.run(sql, [reviewId, reviewerId], function (err) {
            if (err) {
                reject('500')
            } else {
                resolve()
            }
        })
    })
}

/**
 * Complete and update a review
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.updateSingleReview = function (review, reviewId, coop) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT * FROM reviews r, reviews_users rs WHERE r.id = rs.reviewId AND r.id=?";
        db.all(sql1, [reviewId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if (rows[0].coop !== coop){
                reject(403)
            } else {
                var sql2 = 'UPDATE reviews SET completed = ?';
                var parameters = [1];
                if (review.reviewDate != undefined) {
                    sql2 = sql2.concat(', reviewDate = ?');
                    parameters.push(review.reviewDate);
                } else {
                    sql2 = sql2.concat(', reviewDate = ?');
                    var today = new Date();
                    var dd = String(today.getDate()).padStart(2, '0');
                    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    var yyyy = today.getFullYear();
                    today = yyyy + '-' + mm + '-' + dd;
                    parameters.push(today);
                }
                sql2 = sql2.concat(', rating = ?');
                parameters.push(review.rating);

                sql2 = sql2.concat(', review = ?');
                parameters.push(review.review);

                sql2 = sql2.concat(' WHERE id = ?');
                parameters.push(reviewId);

                db.run(sql2, parameters, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(null);
                    }
                })
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
    limits.push(req.params.filmId);
    limits.push(req.params.filmId);
    if (req.query.pageNo == null) {
        pageNo = 1;
    }
    limits.push(size * (pageNo - 1));
    limits.push(size);
    return limits;
}


const createReview = function (row) {
    var completedReview = (row.completed === 1) ? true : false;
    return new Review(row.id, row.fid, completedReview, row.reviewDate, row.rating, row.review);
}