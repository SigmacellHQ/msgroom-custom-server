// This file puts all the APIs, like /api/keys, etc
import { Router } from "express";
import keys from "./keys.js";

const router = Router();

router.use('/keys', keys);

export default router;