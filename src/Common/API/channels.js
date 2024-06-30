import { Router } from "express";

const router = Router();

router.get('/islocked', (req, res) => {
    res.send({ locked: false });
});

export default router;