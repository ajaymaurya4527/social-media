import { Router } from "express";
import { 
    createPost, 
    toggleLike, 
    getUserPosts, 
    deletePost, 
    getHomeFeed, 
    toggleFollow ,
    toggleSavePost,
    getSavedPosts,
    addComment,
    getPostComments
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT); // Secure all routes

// Post Operations
router.route("/create-post").post(upload.array("mediaFiles", 10), createPost);
router.route("/feed").get(getHomeFeed);
router.route("/u/:username").get(getUserPosts);
router.route("/:postId").delete(deletePost);

router.route("/save/:postId").post(toggleSavePost);
router.route("/saved-posts").get(getSavedPosts);

// Interaction Operations
router.route("/like/:postId").post(toggleLike);
router.route("/follow/:userIdToFollow").post(toggleFollow);

// Append this route alongside existing interaction mapping declarations
// Change .post(getPostComments) to .get(getPostComments)
router.route("/comment/:postId").post(addComment);
router.route("/getPostComment/:postId").get(getPostComments);


export default router;