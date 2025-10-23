import mongoose from 'mongoose';
import { Model } from 'mongoose';
import { asyncHandler } from './asyncHandler.js';
import { Request, Response, Router } from 'express';

export function crudHandlers<T>(model: Model<T>, name: string) {
  return {
    create: asyncHandler(async (req: Request, res: Response) => {
      const doc = await model.create(req.body);
      res.status(201).json(doc);
    }),
    list: asyncHandler(async (_req: Request, res: Response) => {
      const docs = await model.find().lean();
      res.json(docs);
    }),
    get: asyncHandler(async (req: Request, res: Response) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const doc = await model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${name} not found` });
      res.json(doc);
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!doc) return res.status(404).json({ message: `${name} not found` });
      res.json(doc);
    }),
    remove: asyncHandler(async (req: Request, res: Response) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      const doc = await model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: `${name} not found` });
      res.json({ message: `${name} deleted` });
    })
  };
}

export function buildCrudRouter<T>(model: Model<T>, name: string) {
  const r = Router();
  const h = crudHandlers(model, name);
  r.post('/', h.create);
  r.get('/', h.list);
  r.get('/:id', h.get);
  r.patch('/:id', h.update);
  r.delete('/:id', h.remove);
  return r;
}
