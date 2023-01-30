class Review{    
    constructor(id, filmId, completed, reviewDate, rating, review) {
        this.id = id;
        this.filmId = filmId;
        this.completed = completed;

        if(reviewDate)
            this.reviewDate = reviewDate;
        if(rating)
            this.rating = rating;
        if(review)
            this.review = review;
        
        const selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.id;
        this.self =  selfLink;
    }
}

module.exports = Review;


