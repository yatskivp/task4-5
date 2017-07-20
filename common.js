const fs = require('fs');
const Joi = require('joi');

const schemaUser = Joi.object().keys({
    username: Joi.string().min(4).max(20).required(),
    password: Joi.string().alphanum().min(8).required(),
    email: Joi.string().email().required(),
    role: Joi.valid().allow(['superadmin', 'admin', 'user']).required()
}).with('username','password','email','role');

const schemaGroup = Joi.object().keys({
    name: Joi.string().min(4).required(),
    listOfUsers: Joi.array().items(Joi.number()).min(1).required()
}).with('name','listOfUsers');

const schemaPatchUser = Joi.object().keys({
    username: Joi.string().min(4).max(20),
    password: Joi.string().alphanum().min(8),
    email: Joi.string().email(),
    role: Joi.valid().allow(['superadmin', 'admin', 'user'])
})

const schemaPatchGroup = Joi.object().keys({
    name: Joi.string().min(4),
    listOfUsers: Joi.array().items(Joi.number()).min(1)
})
let read = (file) => { //function for reading json files with data
    return JSON.parse(fs.readFileSync(file,'utf-8'));
}

let write = (file,data) => { //function for writing data into json files 
    return new Promise((resolve,reject) => {
        fs.writeFile(file, JSON.stringify(data), (err) => {
            if(err){
               return reject(err);
            }else{
              return resolve();
            }
        })
    })
}

let getUsers = (req,res) => {
   return new Promise((resolve,reject) => {
        return resolve(res.status(200).json(read('users.json')))
    })
}

let getGroups = (req,res) => {
   return new Promise((resolve,reject) => {
        return resolve(res.status(200).json(read('groups.json')))
    })
}

let validUserPost = (file,req,res,next) => {//handler for adding new user
    return new Promise((resolve,reject) => {
        let valid = Joi.validate(req.body,schemaUser);
        if(!valid.error){
            let usersArr = read(file);
            if(!usersArr.length){
                req.body.role = 'superadmin'; //if list of users is empty, then 1-st user becomes superadmin
            }
            let id = 1;
            for(let element of usersArr){
                id = +element.id;
                if(element.role == req.body.role && req.body.role == 'superadmin'){//can't be more then 2 superadmins
                    return resolve ({error:"Can't set role 'superadmin'"});
                }
                if(element.email == req.body.email){//must be unequal emails
                    id = 0;
                }
            };
            if(id){//if role != superadmins and email unequal existing mails, add user to db
                usersArr.push({id:id+1,username:req.body.username,password:req.body.password,email:req.body.email,role:req.body.role});
                write(file,usersArr)
                    .then(() => {
                        return new Promise((resolve,reject) => {
                           return resolve(res.status(200).json({userId:id+1}))
                        })
                    })
                    .catch((e) => {
                         return new Promise((resolve,reject) => {
                           return resolve(e)
                        })
                    })
                    
            }else{
               return resolve({error:"Duplicate email"})
            }

        }else{
            return resolve ({error:valid.error.details[0].message})
        }
    })  
}

let validGroupPost = (file,req,res,next) => {//handler for adding new group
    return new Promise((resolve,reject) => {
        let valid = Joi.validate(req.body,schemaGroup);
        console.log(valid);
        if(!valid.error){
            let groupArr = read(file);
            let id = 1;
            for(let element of groupArr){
                id = +element.id;
                if(element.name == req.body.name){//Checking group name 
                    id = 0;
                    return resolve({error:`${req.body.name} group is already exists`})
                }
            };
            if(id){
                req.body.listOfUsers = JSON.parse(req.body.listOfUsers);
                groupArr.push({id:id+1,name:req.body.name,listOfUsers:req.body.listOfUsers});
                write(file,groupArr)
                    .then(() => {
                        return new Promise((resolve,reject) => {
                           return resolve(res.status(200).json({groupId:id+1}))
                        })
                    })
                    .catch((e) => {
                         return new Promise((resolve,reject) => {
                           return resolve({error:e})                        })
                    })

            }else{
                return resolve({error:"Invalid group Id"})
            }

        }else{
            return resolve({error:valid.error.details[0].message})
        }
    })  
}

let deleteUser = (req,res) => {//handler for user deleting 
    return new Promise((resolve,reject) => {
        let userArr = read('users.json');
        let index = -1;
        if (userArr.length == 0){
           return resolve(res.status(200).json({operation:"User's list is empty"}))
        }
        userArr.forEach((element,i) => {
            if(element.id == req.params.userId) {
                index = i;
            }
        });       
        if(index == -1){
             resolve(res.status(404).json({error:"User not found"}))
        }else{//deleting user's id from listOfUsers in group.json file
            if(userArr[index].role == 'superadmin'){// it is impossible to remove superadmin  
                return resolve({error:"This user couldn't be deleted"})
            }
            let delUserName = userArr.splice(index,1)[0].username;
            let groupArr = read('groups.json');
            let rewrite = false;        
            for(let val of groupArr){
                let possition = val.listOfUsers.indexOf(+req.params.userId);
                if(~possition){
                    rewrite = true;
                    val.listOfUsers.splice(possition,1);
                }
            } 
            if(rewrite){
                write('groups.json',groupArr)
                    .catch((e) => {
                        return new Promise((resolve,reject) => {
                           return resolve({error:e})
                        })
                    })
            }
            write('users.json',userArr)
                .then(() => {
                    return new Promise((resolve,reject) => {
                       return resolve(res.status(200).json({operation:`User ${delUserName} was deleted successful`}))
                    })
                })
                .catch((e) => {
                    return new Promise((resolve,reject) => {
                        return resolve({error:e})                        
                    })
                })
        } 
    })
}

let deleteGroup = (req,res) => {//handler for group deleting
    return new Promise((resolve,reject) => {
        let groupArr = read('groups.json');
        let position = -1;    
        groupArr.forEach((item,i) =>{
            if(item.id == req.params.groupId){
                position = i;
            }
        })
        if(~position){
            let delGroup = groupArr.splice(position,1)[0].name;
            write('groups.json',groupArr)
                .then(() => {
                    return new Promise((resolve,reject) => {
                       return resolve(res.status(200).json({operation:`Group ${delGroup} was deleted successful`}))
                    })
                })
                .catch((e) => {
                    return new Promise((resolve,reject) => {
                       return resolve({error:e})                        
                    })
                })
        }else{
            return resolve(res.status(404).json({error:"Group not found"}))
    }
    })
};

let patchUser = (req,res) => { //handler for updata information about user
    return new Promise((resolve,reject) =>{
        let valid = Joi.validate(req.body,schemaPatchUser);
            if(!valid.error){
            let userArr = read('users.json');
            let index = -1, count = 0, idSup;
            userArr.forEach((item,i) => {
                if(item.role == 'superadmin' && req.body.role != undefined ){
                    checkSuperadmin = true;
                    idSup = item.id;
                    count++;
                }
                if(item.id == req.params.userId){                    
                    index = i;
                }
            })
            console.log(count);
            if(req.params.userId == idSup && count == 1){
                return resolve({error:"Can't change user's role"})
            }
            if(~index){
                let user = userArr[index].username;
                userArr[index].username = req.body.username || userArr[index].username;
                userArr[index].password = req.body.password || userArr[index].password;
                userArr[index].email = req.body.email || userArr[index].email;
                userArr[index].role = req.body.role || userArr[index].role;
                write('users.json',userArr)
                    .then(() => {
                        return new Promise((resolve,reject) => {
                            return resolve(res.status(200).json({operation:`User ${user} was update successful`}))
                        })
                    })
                    .catch((e) => {
                        return new Promise((resolve,reject) => {
                            return resolve({error:e})                        
                        })
                    })
            }else{
                return resolve({error:'User not found'})
            }
        }else{
            return resolve({error:valid.error.details[0].message})
        }
    })
}

let patchGroup = (req,res) => {//handler for updata information about group
    return new Promise((resolve,reject) =>{
        let groupArr = read('groups.json');
        let valid = Joi.validate(req.body,schemaPatchGroup);
        if(!valid.error){
             let index = -1;
             groupArr.forEach((item,i) => {
                 if(req.params.groupId == item.id){                  
                    index = i;
                 }
            })
            if(~index){
                req.body.listOfUsers = JSON.parse(req.body.listOfUsers);
                let group = groupArr[index].name;
                groupArr[index].name = req.body.name || groupArr[index].name;
                if(req.body.listOfUsers){
                    for(let val of req.body.listOfUsers){
                        let exist = true;
                        for(let val2 of groupArr[index].listOfUsers){
                            if(val == val2){
                                exist = false
                                break;
                            }                            
                        }
                        if(exist){
                            console.log(val);
                            groupArr[index].listOfUsers.push(val)
                        }
                    }
                }
                write('groups.json',groupArr)
                    .then(() => {
                        return new Promise((resolve,reject) => {
                            return resolve(res.status(200).json({operation:`Group ${group} was update successful`}))
                        })
                    })
                    .catch((e) => {
                        return new Promise((resolve,reject) => {
                            return resolve({error:e})                        
                        })
                    })
            }else{
                return resolve({error:'Group not found'})
            }
        }else{
            return resolve({error:valid.error.details[0].message})
        }  
    })
}

exports.getUsers = getUsers;
exports.getGroups = getGroups;
exports.validUserPost = validUserPost;
exports.validGroupPost = validGroupPost;
exports.patchUser = patchUser;
exports.patchGroup = patchGroup;
exports.deleteUser = deleteUser;
exports.deleteGroup = deleteGroup;