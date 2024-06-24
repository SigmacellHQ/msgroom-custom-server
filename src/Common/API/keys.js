import { Router } from "express";

const router = Router();

router.get('/add', (req, res) => {
    res.send("skibidi");
});

export default router;