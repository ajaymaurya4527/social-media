import {Router} from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser,loginUser,lagoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccount,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory,updateAccountDetails,searchUsers,getUserPublicProfile,generateAccessAndRefereshTokens} from "../controllers/user.controller.js";

const router=Router();

router.route("/register").post(upload.fields([
    {name:"avatar",maxCount:1},
    {name:"coverImage",maxCount:1}
]),registerUser)

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,lagoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
//router.route("/update-account").patch(verifyJWT,updateAccount)
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/search").get(verifyJWT, searchUsers);
router.route("/profile/:username").get(verifyJWT, getUserPublicProfile);


router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/watchHistor").get(verifyJWT,getWatchHistory)




export default router;