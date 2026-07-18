

import authRoutes from "./routes/auth"
import surveyRoutes from "./routes/survey"
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';


const app: Express = express();
const PORT=process.env.PORT||3000;

app.use(cors());
app.use(express.json());
app.use("/api/auth",authRoutes)
app.use("/api/surveys", surveyRoutes)
app.get('/', (req: Request, res: Response) => {
  res.json({status:"ok"});
});

app.listen( PORT,()=>{

         console.log(`server running on port ${PORT}`);
});

    
   