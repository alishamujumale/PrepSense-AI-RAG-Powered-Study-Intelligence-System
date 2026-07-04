import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITopicFrequency {
  topic:       string
  count:       number
  percentage:  number
  sampleQuestions: string[]
}

export interface IPYQAnalysis extends Document {
  userId:     string
  examId:     string
  subject:    string
  totalQuestions: number
  topicRanking:   ITopicFrequency[]
  analyzedAt: Date
}

const TopicFrequencySchema = new Schema<ITopicFrequency>({
  topic:           { type: String, required: true },
  count:           { type: Number, required: true },
  percentage:      { type: Number, required: true },
  sampleQuestions: [{ type: String }],
}, { _id: false })

const PYQAnalysisSchema = new Schema<IPYQAnalysis>({
  userId:         { type: String, required: true, index: true },
  examId:         { type: String, required: true, index: true },
  subject:        { type: String, required: true },
  totalQuestions: { type: Number, default: 0 },
  topicRanking:   [TopicFrequencySchema],
}, { timestamps: { createdAt: 'analyzedAt', updatedAt: false } })

// One analysis per user+exam+subject — re-analyzing overwrites the old one
PYQAnalysisSchema.index({ userId: 1, examId: 1, subject: 1 }, { unique: true })

const PYQAnalysis: Model<IPYQAnalysis> =
  mongoose.models.PYQAnalysis ??
  mongoose.model<IPYQAnalysis>('PYQAnalysis', PYQAnalysisSchema)

export default PYQAnalysis