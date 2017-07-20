//GET /user - return array of user's object
//GET /user/group - return array of groups
//POST /user  - body {username,password,email,role} - creat user
//POST /user/group - body {name,listOfUsers} - create group
//PATCH /user/:userId - body {username,password,email,role} - update information about user
//PATCH /user/group/:groupId - body {name,listOfUsers} - update information about group
//DELETE /user/:userId - remove user
//DELETE /user/group/:groupId - remove group

const express = require('express');
const bodyParser = require('body-parser');
const comm = require('./common.js');
const app = express();

app.use(bodyParser());

app.route('/user')
    .get((req,res,next) => {
       comm.getUsers(req,res)
        .then(result => {
          console.log(result);
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
      })
        .catch((e) => next(e))
    })
    .post((req,res,next) => {
      comm.validUserPost('users.json',req,res)
        .then(result => {
          console.log(result);
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
      })
        .catch((e) => next(e))
    })

app.route('/user/group')
    .get((req,res,next) => {
      comm.getGroups(req,res)
        .then(result => {
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
      })
      .catch((e) => next(e))
    })
    .post((req,res,next) => {
      comm.validGroupPost('groups.json',req,res)
        .then(result => {
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
      })
      .catch((e) => next(e))
    })

app.route('/user/:userId')
    .patch((req,res,next) => {
      comm.patchUser(req,res)
        .then(result => {
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
        })
        .catch((e) => next(e))
    })
    .delete((req,res,next) => {
      comm.deleteUser(req,res)
        .then(result => {
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
      })
        .catch((e) => next(e))
    })

app.route('/user/group/:groupId')
    .patch((req,res,next) => {
      comm.patchGroup(req,res)
        .then(result => {
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
        })
        .catch((e) => next(e))
    })
    .delete((req,res,next) => {
      comm.deleteGroup(req,res)
        .then(result => {
          if(result.error){
            throw new Error(result.error)
          }else{
            return result
          }
        })
        .catch((e) => next(e))
    })

app.use((err,req,res,next) => {
    res.status(400).json({error:err.message})
})

app.listen(3000,() => console.log('Server started on 3000 port'))