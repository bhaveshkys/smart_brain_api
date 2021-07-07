import express from 'express';
import cors from 'cors';
import knex from 'knex';
import bcrypt from 'bcrypt-nodejs';
import Clarifai from 'clarifai';
const capp = new Clarifai.App({
  apiKey: 'a01473ba526b4a8abe4a7694a71a5f86'
})


const app = express()

const DB = knex({
  client: 'pg',
  connection: { 
    connectionString: process.env.DATABASE_URL, // dynamic database value for heroku    
    ssl: true
  }
});

DB.select().table('users').then(data=>{
  console.log(data);
});


app.use(express.urlencoded({extended: true}));
app.use(express.json({extended: true}));
app.use(cors());

app.post('/signin',(req,res) =>{
  if(!email || !password){
    return( res.status(400).json("incorrect form submission"));
  }
  DB.select('email','hash').from('login')
  .where('email','=',req.body.email)
  .then(data=>{
    const isValid=bcrypt.compareSync(req.body.password,data[0].hash);
    if(isValid){
      return DB.select('*').from('users')
      .where('email','=',req.body.email)
      .then(user=>{
        res.json(user[0])
      })
      .catch(err=>res.status(400).json('unable to get user'))
    }else{
      res.json('wrong email or password')
    }
  })
  .catch(err=> res.status(400).json('wrong email or password') )
})
app.post('/register',(req,res) =>{
  const{name,email,password}=req.body;
  if(!email || !name || !password){
    return( res.status(400).json("incorrect form submission"));
  } else {
    const hash = bcrypt.hashSync(password);
    DB.transaction(trx=>{
      trx.insert({
        hash:hash,
        email:email
      })
      .into('login')
      .returning('email')
      .then(LoginEmail=>{
        return trx('users')
        .returning('*')
        .insert({
          email:LoginEmail[0],
          name:name,
          joined:new Date()
        })
        .then(user=>{
          res.json(user[0]);
        })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err=>res.status(400).json("unable to register"))
  }
  
})
app.get('/', function (req, res) {
  res.send("this server is working");
})
app.post('/profile/:id',(req,res) =>{
  const{id}=req.params;
  DB.select('*').from('users').where({id})
  .then(user=>{
    if(user.length){
    res.json(user[0])
    } else{
      res.status(400).json('Not found')
    }
  })
  .catch(err=> res.status(400).json('error getting user'))
})
app.put('/image',(req,res) =>{
  let found=false;
  const{id}=req.body;
  DB('users').where('id','=',id)
  .increment('entries',1)
  .returning('entries')
  .then(entries=>{
    res.json(entries)
  })
  .catch(err=>res.status(400).json("unable to display entries"))
}
)
app.post('/imageURL',(req,res) =>{
  capp.models.predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
  .then(data=>{
    res.json(data);
  })
  .catch(err=>res.status(400).json('unable to work with API'))
})

app.listen(process.env.PORT ,()=>{
  console.log(`app is running on port ${process.env.PORT}`)
})