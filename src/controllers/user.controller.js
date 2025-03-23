import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js' ;
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken= refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating access and refresh token ")
    }
}



const registerUser = asyncHandler( async(req,res)=>{
    const {username,fullname,email,password}=req.body
    

    if(
        [fullname,username,email,password].some((field)=>field?.trim()==='')
    ){
        throw new ApiError(400,"all field are required")
    }
    
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username already exist")
    }
    console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is required")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar is required")
    }

    const user = await User.create(
        {
        username:username.toLowerCase(),
        fullname,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",

    },
    console.log(User)
    )
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user created successfully")    
    )
} )

const loginUser = asyncHandler(async(req,res)=>{
    // req body => data
    //check username,password,email is available or empty
    //find user
    //password check
    //access and refresh token generate
    //send secure cookies

    const {email,username,password}=req.body

    if(!username || !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Password")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInuser =await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly:true,
        secure:true,
    }

    return res.status(200).cookie("access token", accessToken, options).cookie("refresh token", refreshToken,options).json(200,{
        user: loggedInuser, refreshToken, accessToken
    },"User logged in Successfully")
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options ={
        httpOnly:true,
        secure:true,
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user Logged Out Successfully"))
})
export {registerUser,
    loginUser,
    logoutUser,
};