import { Platform } from 'react-native'
import * as _ from 'lodash'
import * as FileSystem from 'expo-file-system'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { Video } from 'react-native-compressor'
import * as ImageManipulator from 'expo-image-manipulator'
import 'react-native-get-random-values'
import { v4 as uuid } from 'uuid'

const BASE_DIR = `${FileSystem.cacheDirectory}expo-cache/`

// Checks if given directory exists. If not, creates it
async function ensureDirExists(givenDir) {
  const dirInfo = await FileSystem.getInfoAsync(givenDir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(givenDir, { intermediates: true })
  }
}

export const downloadFile = async (file, fileName) => {
  try {
    await ensureDirExists(BASE_DIR)
    const fileUri = `${BASE_DIR}${fileName}`
    const info = await FileSystem.getInfoAsync(fileUri)
    const { exists, uri } = info

    if (exists) {
      return { uri }
    }

    const downloadResumable = FileSystem.createDownloadResumable(file, fileUri)

    return downloadResumable.downloadAsync()
  } catch (error) {
    return { uri: null }
  }
}

const compressVideo = async sourceUri => {
  // On iOS, videos are already compressed, so we just return the original
  if (Platform.OS === 'ios' || Platform.OS === 'web') {
    return new Promise(resolve => {
      console.log("no compression needed, as it's iOS or web")
      resolve(sourceUri)
    })
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(sourceUri)
    console.log(
      'compressing video of initial size ' +
        fileInfo.size / (1024 * 1024) +
        'M',
    )
    console.log(sourceUri)

    // Use react-native-compressor for video compression
    const compressedUri = await Video.compress(
      sourceUri,
      {
        compressionMethod: 'auto',
        bitrate: 1000000, // 1 Mbps - good balance between quality and size
      },
      (progress) => {
        console.log('Compression Progress: ', progress)
      }
    )

    const compressedFileInfo = await FileSystem.getInfoAsync(compressedUri)
    console.log(
      'compressed video to size ' +
        compressedFileInfo.size / (1024 * 1024) +
        'M',
    )
    console.log(compressedUri)

    return compressedUri
  } catch (error) {
    console.log('Video compression error:', error)
    // If compression fails, return original video
    return sourceUri
  }
}

const createThumbnailFromVideo = videoUri => {
  let processedUri = videoUri
  if (Platform.OS === 'android' && !processedUri.includes('file:///')) {
    processedUri = `file://${processedUri}`
  }
  console.log('createThumbnailFromVideo processedUri ' + processedUri)
  return new Promise(resolve => {
    if (Platform.OS === 'web') {
      return resolve(null)
    }
    VideoThumbnails.getThumbnailAsync(processedUri)
      .then(newThumbnailSource => {
        resolve(newThumbnailSource)
      })
      .catch(error => {
        console.log(error)
        resolve(null)
      })
  })
}


const resizeImage = async ({ image }, callback) => {
  const imagePath = image?.path || image?.uri

  ImageManipulator.manipulateAsync(imagePath, [], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  })
    .then(newSource => {
      if (newSource) {
        callback(newSource.uri)
      }
    })
    .catch(err => {
      callback(imagePath)
    })
}

/**
 * This function takes a media file object as the first argument and callback function as the second argument.
 * The media file object can either be a photo object or a video object.
 * If the media file is a photo object, this function resizes the photo and calls the callback function with an object of a processed uri.
 * If the media file is a video object, this function compresses the video file and creates a thumbnail from the compressed file. Then
 * calls the callback function with an object of a processed uri and thumbnail uri.
 * @param {object} file
 * @param {function} callback
 */
export const processMediaFile = (file, callback) => {
  const { type, uri, path } = file
  const fileSource = uri || path

  const includesVideo = type?.includes('video')
  if (includesVideo) {
    compressVideo(fileSource).then(processedUri => {
      createThumbnailFromVideo(processedUri).then(thumbnail => {
        callback({
          thumbnail: {
            ...thumbnail,
            fileName: '46002D33-E0C1-406F-BFD2-5B9E30E7F1DB.jpg',
          },
          processedUri,
        })
      })
    })
    return
  }

  const includesImage = type?.includes('image')
  if (includesImage) {
    resizeImage({ image: file }, processedUri => {
      callback({ processedUri })
    })
    return
  }
  callback({ processedUri: fileSource })
}

// DEPRECATED: This function used FFmpeg which has been removed
// If you need video/audio blending, consider using a different library
// export const blendVideoWithAudio = async (
//   { videoStream, audioStream, videoRate },
//   callback,
// ) => {
//   await ensureDirExists(BASE_DIR)
//   const processedUri = `${BASE_DIR}${uuid()}.mp4`
//   let command = `-i ${videoStream} -i ${audioStream} -map 0:v:0 -map 1:a:0 -shortest ${processedUri}`

//   if (videoRate) {
//     command = `-i ${videoStream} -i ${audioStream} -filter:v "setpts=PTS/${videoRate}" -map 0:v:0 -map 1:a:0 -shortest ${processedUri}`
//   }

//   console.log('blendVideoWithAudio command ' + command)
//   FFmpegKit.execute(command).then(async session => {
//     const output = await session.getOutput()
//     callback(processedUri)
//   })
// }
