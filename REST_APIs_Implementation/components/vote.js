class Vote {
  constructor(id, userId, agree, description, filmId, reviewId, draftId) {
    if (id)
      this.id = id;

    this.agree = agree;
    this.userId = userId;
    if (description)
      this.description = description;

      var selfLink = `/api/films/public/${filmId}/reviews/${reviewId}/drafts/${draftId}/votes/${id}`;
    this.self = selfLink;
  }
}

module.exports = Vote;