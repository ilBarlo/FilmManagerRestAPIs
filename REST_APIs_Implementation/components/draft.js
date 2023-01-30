class Draft {
    constructor(id, reviewId, rating, review, userId, status, filmId) {
        if (id)
            this.id = id;

        this.reviewId = reviewId;
        this.review = review;
        this.userId = userId;
        this.status = status;
        this.rating = rating;

        var selfLink = `/api/films/public/${filmId}/reviews/${reviewId}/drafts/${id}`;
        this.self = selfLink;
    }
}

module.exports = Draft;
