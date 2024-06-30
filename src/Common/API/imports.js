// This file puts all the APIs, like /api/keys, etc
import { Router } from "express";
import keys from "./keys.js";
import channels from "./channels.js";

const router = Router();

router.use('/keys', keys);
router.use('/channels', channels);

export default router;