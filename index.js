const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 7000

// middleware
app.use(cors(
  {
    origin:['http://localhost:5173'],
    credentials:true
  }
));
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req,res,next)=>{
    const token = req.cookies?.token;
    // console.log('token inside verifyLogger',token)
    if(!token){
      return res.status(401).send({message:'unauthorized access'});
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decode)=>{
      if(err){
        return res.status(401).send({message:'unauthorized access'})
      }
      next()
    })
   
}


// DB user = job_hunter
// DB pass = tFa43jyjglBAcsA9



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.92ej0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // job related api
    const jobCollection = client.db('jobPortal').collection('jobs');
    const jobApplicationCollection = client.db('jobPortal').collection('job-application')

        app.get('/jobs',async(req,res)=>{

            const email = req.query.email
            let query = {}
            if(email){
              query = {hr_email:email}
            }
            const cursor = jobCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/jobs/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:new ObjectId(id)}
            const result = await jobCollection.findOne(query)
            res.send(result)
        })

        app.post('/jobs',async(req,res)=>{
          const newJob = req.body
          const result = await jobCollection.insertOne(newJob);
          res.send(result)
        })

        // job-application api

        app.get('/job-application',verifyToken,async(req,res)=>{
              const email = req.query.email
              const query = {application_email:email}
             
              const result = await jobApplicationCollection.find(query).toArray();

              // fokira way to aggregate data
              for(application of result){
                console.log(application.job_id)
                const query1 = {_id:new ObjectId(application.job_id)}
                const job = await jobCollection.findOne(query1);
                if(job){
                    application.title = job.title;
                    application.company = job.company;
                    application.company_logo = job.company_logo;
                    application.location = job.location
                }

              }
              res.send(result)
        })

        app.get('/job-applications/jobs/:id',async(req,res)=>{
              const id = req.params.id;
              const query = {job_id:id}
              const result = await jobApplicationCollection.find(query).toArray();
              res.send(result)
        })

        app.post('/job-applications',async(req,res)=>{
          const application = req.body;
          const result = await jobApplicationCollection.insertOne(application);

          // Not the best way 
          const id = application.job_id
          const query = {_id:new ObjectId(id)}
          const job = await jobCollection.findOne(query)
          let count = 0;
          if(job.applicationCount){
            newCount = job.applicationCount+1;
          }else{
            newCount = 1
          }

          // now update the job info

          const filter = {_id: new ObjectId(id)}
          const updatedDoc = {
            $set:{
              applicationCount:newCount
            }
          }

          const updateResult = await jobCollection.updateOne(filter,updatedDoc)

          res.send(result)

        })

        app.patch('/job-applications/:id',async(req,res)=>{
            const id = req.params.id;
            const data = req.body
            const query = {_id:new ObjectId(id)}
            const updatedDoc = {
              $set:{
                  status:data.status
              }
            }

            const result = await jobApplicationCollection.updateOne(query,updatedDoc);
            res.send(result)
        })

        app.delete('/job-applications/:id',async(req,res)=>{
          const  id = req.params.id;
          const query = {_id:new ObjectId(id)}
          const result = await jobApplicationCollection.deleteOne(query);
          res.send(result)
        })

        // auth related api
        app.post('/jwt',(req,res)=>{
          const user = req.body;
          const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'5h'})
          res.cookie('token',token,{
            httpOnly:true,
            secure:false
          })
          .send({success:true})
        })

        app.post('/logout',(req,res)=>{

          res.clearCookie('token',{
            httpOnly:true,
            secure:false
          })
          .send({success:true})

        })

     

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',async(req,res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`app is running on port ${port}`)
})
