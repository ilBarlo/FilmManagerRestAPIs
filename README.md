# Exam Call #1  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" height="25"/>

<div align="center">
<i>BARLETTA Francesco Pio<br>
s296114<br>
Distributed systems programming, A.A. 22/23</i>
</div>

## Summary

- [Folders' contents](#folders-contents)
- [How to run the code](#how-to-run-the-code)
  - [Tutorial](#tutorial)
  - [Credentials](#credentials)
  - [Error Management: examples](#error-management)
- [Main Design choices](#main-design-choices)

## Folders' contents 

- <b>"JSON Schemas"</b> contains the design of the JSON Schemas;
- <b>"REST APIs Design"</b> contains the full Open API documentation of the REST APIs in JSON & YAML;
- <b>"REST_APIs_Implementation"</b> contains the code of the service application.

## How to run the code 
In the root folder, there is a <b>Postman collection</b> in which there are example on how to perform actions related to the new and modified APIs. However, there it is a small guide to <i>how to run the project</i>:

- Go into the folder "REST_APIs_Implementation"
- Run the command `npm install`
- Run the command `nodemon` (or `node index.js`)
- Rest APIs are exposed on http://localhost:3001/api
- OpenAPI Swagger Documentation is exposed on http://localhost:3001/docs

### Tutorial
In this small tutorial, I will show how to issue a film to more reviewers, create a Draft for the review, create a vote for a draft and, finally, approve the review. All the names of the methods are the one present in the Postman Collection:

1. <b>Login</b> for the user 1 (<i>user.dsp@polito.it</i>)
2. <b>PostNewReview</b> with the following body: 

```
[
    {
        "reviewerId": 5,
        "filmId": 3
    },
    {
        "reviewerId": 4,
        "filmId": 3
    }
]
```
3. <b>Login</b> for the user 5 that is one of the reviewer (<i>beatrice.golden@polito.it</i>)
4. <b>PostNewDraft</b> with the following body: 

```
{
    "reviewId": 1,
    "rating": 3,
    "review": "text",
    "userId": 5
}
```
5. With <b>GetDraftsByReview</b> we can see the draft previously created: 
```
res:

{
    "totalPages": 1,
    "currentPage": 1,
    "totalItems": 1,
    "drafts": [
        {
            "id": 32,
            "reviewId": 1,
            "review": "text",
            "userId": 5,
            "status": "IN_PROGRESS",
            "rating": 3,
            "self": "/api/films/public/3/reviews/1/drafts/32"
        }
    ]
}
```
6. <b>Login</b> for the user 4 that is one of the reviewer (<i>rene.regeay@polito.it</i>)

7. <b>PostNewVote</b> to create a new vote in which the user can agree/disagree the draft created (in case of <i>disagree</i> the user should also provide a description):

```
{
    "userId": 4,
    "draftId": 32,
    "agree": true
}
```

8. Finally, the draft is closed (`status: COMPLETED`), as we can see with <b>GetDraftById</b>:

```
res:

{
    "id": 32,
    "reviewId": 1,
    "review": "text",
    "userId": 5,
    "status": "COMPLETED",
    "rating": 3,
    "self": "/api/films/public/3/reviews/1/drafts/32"
}
```

9. And the review is also completed (`completed: true`), as we can see with <b>GetSingleReviewById</b>:

```
res:

{
    "id": 1,
    "filmId": 3,
    "completed": true,
    "rating": 3,
    "review": "text",
    "self": "/api/films/public/3/reviews/1"
}
```

### Credentials
For this example I used these credentials: 

  |id|email|password|
  |:---:|:---:|:---:|
  |1|user.dsp@polito.it|password|
  |2|rene.regeay@polito.it|password|
  |3|beatrice.golden@polito.it|password|

### Error management
Some examples of error management following the previous steps in the tutorial. All the names of the methods are the one present in the Postman Collection:

- After the issue of a cooperative review (STEP 2: <b>PostNewReview</b>), if one user try to complete this review as a single review with <b>UpdateSingleReviewById</b> (without creating a draft or vote to agree/disagree the draft), he will receive the following error: 
  <br>
  ```
  "errors": [
      {
          "param": "Server",
          "msg": "The review is cooperative."
      }
  ]
  ```

- If the owner of the draft (STEP 4: <b>PostNewDraft</b>) tries to vote to his draft, he will receive the following error:
  <br>
  ```
  "errors": [
      {
          "param": "Server",
          "msg": "The owner of a draft can't vote."
      }
  ]
  ```

- If a reviewer tries to create a new Draft (STEP 4: <b>PostNewDraft</b>) while there is another one in progress, he will receives the following error:
  <br>
  ```
  "errors": [
      {
          "param": "Server",
          "msg": "Another draft is currently in progress"
      }
  ]
  ```

- If a user that has already voted (STEP 7: <b>PostNewVote</b>) tries to vote again, he will receive the following error: 
  <br>
  ```
  "errors": [
      {
          "param": "Server",
          "msg": "The user has already voted"
      }
  ]
  ```

- If the owner of a film tries to issue a **single** review with **one reviewer** to a reviewer that has already been assigned to a **single** review for that specific film, he will receive the following error: 
  <br>
  ```
  "errors": [
      {
          "param": "Server",
          "msg": "The user has already been assigned to a single review"
      }
  ]
  ```

## Main design choices


- A Review is identified by a unique ID (no more with filmId & ReviewerId)

  |id|filmId|completed|reviewDate|rating|review|coop| 
  |:---:|:---:|:---:|:---:|:---:|:---:|:---:|
  |1|3|1|2023-01-30|5|Wow!|1|

- Since for N reviews now we can have N users, I also created an associative table <b>review_users</b> in which every user is associated to a review

  |reviewId|reviewerId|
  |:---:|:---:|
  |1|3|

- If the review is issued to a single reviewer, a user can update a review in two different ways: 

    - <b>UpdateSingleReviewById</b>: ONLY IF THERE IS ONE REVIEWER FOR THAT FILM (no for co-op reviews), without creating any drafts.
    - <b>PostNewDraft</b>: the user can create a draft that is automatically completed (since it is the only reviewer) and a new review is updated.

- The review is now characterized by a bool flag called `coop` (<i>1 for cooperative, 0 for single</i>).

- Once a review is issued to multiple users, a reviewer can create a Draft, that is also characterized by a unique ID.
- Every draft has a status that can be: 

  - `COMPLETED` 
  - `IN_PROGRESS` 
  - `REJECTED`

- A reviewer can agree or disagree a draft by submit a vote. Every vote is characterized by a unique ID, draftID and userID.

- Drafts are visible to assignees but invisible to everyone else.

- A draft is <b>immutable</b>, so it cannot be directly removed/modified.

- However, if a review is NOT completed, the owner of the film can delete the review (<b>DeleteReviewById</b> in Postman collection) and, in that case, all the drafts/votes related to that review are deleted (in this way I give more control to the owner of the film).

- API `films/public/invited` (<b>GetInvitedReview</b> in Postman collection) has been modified so that it retrieves the public films that the logged-in user has been invited to review (single & co-op).