// is file ka  kaam hai registration karwana user ka 
import {prisma} from "../lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"


// function jo user ko register karne main help karega 


// function to hash password :

async function securePassword(plainTextPassword) {
    
    const saltRounds = 12; 
    
    // Automatically generates a random salt and returns the encrypted string
    const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
    
    return hashedPassword;
}

async function register(req , res)
{
    try{
        const email=req.body.email;
        const password=req.body.password;
        const orgName=req.body.orgName;

        const existingUser= await prisma.user.findUnique({ where: { email } })

        // agar user mille toh error do 

        if(existingUser){
            
            return res.status(400).json({ error: "Email already exists" })
        }
        
        //hasinh our password 

        const hashedPassword=await securePassword(password);

        // transaction organization or user create 

        const result = await prisma.$transaction(async (tx) => {
  const org = await tx.organization.create({
    data: { name: orgName, slug: orgName.toLowerCase().replace(/\s+/g, "-") }
  });
  
  const user = await tx.user.create({
    data: { email, passwordHash: hashedPassword, orgId: org.id }
  });
  
  return { org, user };
});

// jwt sign 


    const token = jwt.sign(
  { userId: result.user.id, orgId: result.org.id, role: result.user.role },
  process.env.JWT_SECRET!,
  { expiresIn: "7d" }
);


//sending respose 

res.json({
  token,
  user: { id: result.user.id, email: result.user.email, role: result.user.role, orgId: result.org.id }
});

        

        
    }

    catch(error){
        console.error(error);
        res.status(500).json({error:"Registration failed"});
    }


}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, orgId: user.orgId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
}

async function logout(req, res) {
  try {
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Logout failed" });
  }
}

export { register, login, logout };
