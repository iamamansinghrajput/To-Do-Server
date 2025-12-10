const mongoose = require('mongoose');

const DB = "mongodb+srv://singhaman2321_db_user:UM6332Ll94n23sql@cluster0.pdxsvqw.mongodb.net/?appName=Cluster0"

mongoose.connect(DB, {})
.then(() =>{
    console.log("connection successfull")
})
.catch((err) => {  
    console.log("no connection"); 
    console.log(err);
});