import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IChatMessage extends Document {
  userId:     string
  examId:     string
  subject:    string
  role:       'user' | 'assistant'
  content:    string
  mode?:      'rag' | 'curriculum'
  chunksUsed?: number
  format?:    string
  createdAt:  Date
}

const ChatMessageSchema = new Schema<IChatMessage>({
  userId:     { type: String, required: true, index: true },
  examId:     { type: String, required: true, index: true },
  subject:    { type: String, required: true, index: true },
  role:       { type: String, enum: ['user', 'assistant'], required: true },
  content:    { type: String, required: true },
  mode:       { type: String },
  chunksUsed: { type: Number },
  format:     { type: String },
}, { timestamps: true })

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ?? mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema)

export default ChatMessage