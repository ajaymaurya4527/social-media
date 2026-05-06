import { User } from "../model/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js"

const registerUser = async (req, res) => {
    try {
        const { username, email, fullName, password } = req.body

        // 1. Validation (Empty fields)
        if ([username, email, fullName, password].some((field) => field?.trim() === "")) {
            return res.status(400).json({ success: false, message: "All fields are required" })
        }

        // 2. Check if user already exists
        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })
        if (existedUser) {
            return res.status(409).json({ success: false, message: "User with email or username already exists" })
        }

        // 3. Check for Avatar (Local Path)
        const avatarLocalPath = req.files?.avatar?.[0]?.path
        if (!avatarLocalPath) {
            return res.status(400).json({ success: false, message: "Avatar file is required" })
        }

        // 4. Check for Cover Image (Optional)
        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }

        // 5. Upload to Cloudinary
        const avatar = await uploadCloudinary(avatarLocalPath);
        const coverImage = await uploadCloudinary(coverImageLocalPath);

        if (!avatar) {
            return res.status(400).json({ success: false, message: "Avatar upload failed" })
        }

        // 6. Create User in DB
        const user = await User.create({
            fullName,
            username: username.toLowerCase(),
            email,
            password,
            avatar: avatar.url,
            coverImage: coverImage?.url || ""
        })

        // 7. Remove sensitive fields from response
        const createdUser = await User.findById(user._id).select("-password -refreshToken")

        if (!createdUser) {
            return res.status(500).json({ success: false, message: "Something went wrong while registering user" })
        }

        const accessToken = createdUser.generateAccessToken();
        const refreshToken = createdUser.generateRefreshToken();

        // 9. Refresh Token ko DB mein save karein
        createdUser.refreshToken = refreshToken;
        await createdUser.save({ validateBeforeSave: false });

        const options = {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 Hours
        };

        // 10. Success Response with Tokens
        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                data: createdUser,
                accessToken, // Frontend ke liye
                refreshToken, // Frontend ke liye
                message: "User registered and logged in successfully"
            });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        })
    }
}
const loginUser = async (req, res) => {
    try {
        // 1. Data lene ka (email or username, aur password)
        const { email, username, password } = req.body;

        // 2. Validation
        if (!(username || email)) {
            return res.status(400).json({ message: "Username or email is required" });
        }

        // 3. User ko find karo DB mein
        const user = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        // 4. Password check karo (aapka custom method)
        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid user credentials" });
        }

        // 5. Access and Refresh token generate karo
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // 6. Refresh token ko DB mein save karo
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // 7. Cookie options set karo (Security ke liye)
        const options = {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000
        };

        // 8. Response bhejo tokens ke saath
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                success: true,
                user: loggedInUser,
                accessToken,
                refreshToken,
                message: "User logged in successfully"
            });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};



export { registerUser, loginUser };