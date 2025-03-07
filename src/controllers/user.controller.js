import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js' ;
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
const registerUser = asyncHandler( async(req,res)=>{
    const {username,fullname,email,password}=req.body
    console.log("email:",password);

    if(
        [fullname,username,email,password].some((field)=>field?.trim()==='')
    ){
        throw new ApiError(400,"all field are required")
    }
    
    const existedUser=User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username already exist")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

    }

    )
    const createdUser = User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user created successfully")
    )
} )


export {registerUser};