import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI ?? process.env.MONGO_URI

if (!MONGODB_URI) {
  throw new Error('Set MONGODB_URI (or MONGO_URI) to your MongoDB Atlas connection string in .env.local')
}

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const cached = global.mongooseCache ?? { conn: null, promise: null }
global.mongooseCache = cached

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
    })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    cached.promise = null
    throw error
  }
}