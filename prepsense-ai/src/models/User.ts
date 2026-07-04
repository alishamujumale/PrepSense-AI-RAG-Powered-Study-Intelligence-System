import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  name:             string
  email:            string
  password:         string
  activeExamId?:    string
  studyHoursPerDay: number
  createdAt:        Date
}

const UserSchema = new Schema<IUser>({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true },
  password:         { type: String, required: true, select: false },
  activeExamId:     { type: String, default: null },
  studyHoursPerDay: { type: Number, default: 4 },
}, { timestamps: true })

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)

export default User