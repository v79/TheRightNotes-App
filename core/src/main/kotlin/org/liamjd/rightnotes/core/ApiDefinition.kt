package org.liamjd.rightnotes.core

import kotlinx.html.*
import kotlinx.html.dom.createHTMLDocument
import kotlinx.html.dom.serialize
import kotlinx.io.ByteArrayOutputStream
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonConfiguration
import org.apache.http.HttpStatus
import ws.osiris.aws.CognitoUserPoolsAuth
import ws.osiris.core.*
import java.io.ByteArrayInputStream
import java.nio.charset.Charset
import java.util.*
import javax.imageio.ImageIO


private val imageMimeTypes: Set<String> = setOf(
		"image/png",
		"image/jpeg",
		"image/jfif"
)

private val DRAFT = "__"

val api = api<RightNotesComponents> {

	val SPOTIFY_SECRET = System.getenv("SPOTIFY_SECRET")

	staticFiles {
		path = "/"
		indexFile = "index.html"
	}

	filter { req, handler ->
		// do anything required around auth (get username, etc)
		// finally, pass it on to the appropriate handler to take action
		handler(req)
	}

	/**
	 * Get the hard-coded AWS authentication configuration details
	 * @return JSON containing four AWS config strings, plus "dev" = true if running Locally (not on AWS), otherwise "dev" = false
	 */
	get("/preauth") { req ->
		val awsAccountId = "086949310404"
		val awsRegion = "eu-west-2"
		val cognitoClientId = "urfqo0jeeh54d5mi1rf70cfmk"
		val apiId = "ru93q91hc7"
		val devJson = mapOf("dev" to isLocal, "awsAccountId" to awsAccountId, "awsRegion" to awsRegion, "cognitoClientId" to cognitoClientId, "apiId" to apiId)
		req.responseBuilder().status(HttpStatus.SC_OK).build(devJson)
	}

	/**
	 * Get a complete listing of markdown files
	 * @return as HTML list
	 */
	auth(CognitoUserPoolsAuth) {
		get("/post-list") { req ->
			val repoFiles = gitService.getPostList("v79", "rightnotes", "sources", "master")
			val postList = createHTMLDocument().ul {
				repoFiles.forEach { sourceFile ->
					val kb = if (sourceFile.fileSize != null) sourceFile.fileSize / 1024 else 0L
					li("file") {
						span(classes = "post-list-item") {
							onClick = "loadMarkdownFile('${sourceFile.source}')"
							title = "$kb kb"
							+sourceFile.name.removePrefix(DRAFT).replace("'", "\\'").removeSuffix(".md")
							if (sourceFile.draft) {
								span(classes = "tag is-light draft") {
									+"DRAFT"
								}
							}
						}
					}
				}
			}
			req.returnHtml(postList.serialize(true))
		}
	}

	/**
	 * Load a source markdown file
	 * @param fileToLoad from request body as String
	 * @return as JSON
	 */
	auth(CognitoUserPoolsAuth) {
		post("/load-markdown") { req ->
			val fileToLoad = req.body<String>()
			println("Loading markdown file $fileToLoad")
			val gitResponse: GitResponse = gitService.loadMarkdownFile("v79", "rightnotes", fileToLoad, "master")
			when(gitResponse) {
				is BasculePost -> {
					if (gitResponse.path.isNotEmpty()) {
						val json = Json(JsonConfiguration.Stable)
						val jsonData = json.stringify(BasculePost.serializer(), gitResponse)
						jsonData
					} else {
						req.responseBuilder().status(HttpStatus.SC_NO_CONTENT).build()
					}
				}
				is ServiceError -> {
					val errorJson =  mapOf("summary" to gitResponse.summary,"detail" to gitResponse.detail)
					req.responseBuilder().status(HttpStatus.SC_INTERNAL_SERVER_ERROR).build(errorJson)
				}
			}
		}
	}

	/**
	 * Create a new draft file
	 * @param postContents markdown source code in body as String
	 * @return created file name
	 */
	auth(CognitoUserPoolsAuth) {
		post("/save-new-file") { req ->
			val postContents = req.body<String>()
			val json = Json(JsonConfiguration.Stable)
			val yamlPost = json.parse(FromJson.serializer(), postContents)
			println(yamlPost)
			// need to sanitise the file name?
			// prepending "__" makes it a draft file
			val fileName = DRAFT + yamlPost.title.replace(Regex("\\W"), " ").trim() + ".md"
			val result = gitService.createNewFile("v79", "rightnotes", "sources/${fileName}", "master", yamlPost, false)
			val status = if (result) HttpStatus.SC_CREATED else HttpStatus.SC_INTERNAL_SERVER_ERROR
			req.responseBuilder().status(status).build(fileName)
		}
	}

	/**
	 * Update an existing markdown source file
	 *  @param postContents markdown source code in body as String
	 *  @return appResponse JSON object
	 */
	auth(CognitoUserPoolsAuth) {
		post("/save-and-update") { req ->
			val postContents = req.body<String>()
			val json = Json(JsonConfiguration.Stable)
			val yamlPost = json.parse(FromJson.serializer(), postContents)
			println("Updating ${yamlPost.path} in Github")

			val appResponse = gitService.updateMarkdownFile("v79", "rightnotes", "${yamlPost.path}", "master", yamlPost)
			req.responseBuilder().status(appResponse.status).build(json.stringify(AppResponse.serializer(),appResponse))
		}
	}

	/**
	 * Retrieve a list of all images
	 * @return list of GalleryImages as JSON
	 */
	auth(CognitoUserPoolsAuth) {
		get("/image-list") { req ->
			val imageList = gitService.getGitHubFileList("v79", "rightnotes", "assets/images/scaled", "master")
			val galleryList = mutableListOf<GalleryImage>()
			imageList.forEach { sourceFile ->
				galleryList.add(GalleryImage(sourceFile.name, "https://www.therightnotes.org/assets/images/scaled/${sourceFile.name}", sourceFile.size))
			}

			if (imageList.isNotEmpty()) {
				val gallery = Gallery(galleryList)
				val json = Json(JsonConfiguration.Stable)
				val jsonData = json.stringify(Gallery.serializer(), gallery)
				jsonData
			} else {
				req.responseBuilder().status(HttpStatus.SC_NO_CONTENT).build()
			}
		}
	}

	/**
	 * TODO: Release a markdown file from draft mode, forcing a rename
	 * @param pathToRelease full path of file to be renamed
	 */
	auth(CognitoUserPoolsAuth) {
		post("/release-from-draft") { req ->
			val pathToRelease = req.body<String>();
			println("Attempting to release $pathToRelease from draft status")
			""
		}
	}

	/**
	 * Upload and resize an image file
	 * @param contentTypeHeader from request header
	 * @param contentDispositionHeader from request header
	 * @param source file name from contentDispositionHeader
	 * @param mimeType of source file from contentTypeHeader
	 * @param image bytearray input stream from body as binary
	 * @return scaledImage byte stream with headers
	 */
	auth(CognitoUserPoolsAuth) {
		post("/upload-image") { req ->
			val contentTypeHeader = req.headers[HttpHeaders.CONTENT_TYPE]
			val contentDispositionHeader = req.headers["Content-Disposition"]
			val filename = contentDispositionHeader.removePrefix("attachment; filename=\"").removeSuffix("\"")
			val (mimeType, _) = ContentType.parse(contentTypeHeader)
			if (!imageMimeTypes.contains(mimeType)) {
				println("Content-Type must be one of $imageMimeTypes")
				req.responseBuilder().status(HttpStatus.SC_BAD_REQUEST).header("Content-Type", "text/plain").build("Image must be a JPG, PNG or JFIF file.")

			} else {
				val image = ImageIO.read(ByteArrayInputStream(req.requireBinaryBody()))
				println("Upload image called with ${filename}, ${mimeType}, ${req.requireBinaryBody().size} bytes")
				val formatName = mimeType.substring(mimeType.indexOf('/') + 1)
				val outputStream = ByteArrayOutputStream()
				ImageIO.write(image, formatName, outputStream)
				val byteArray = outputStream.toByteArray()

				// store the original in git images folder first
				gitService.createBinaryFile("v79", "rightnotes", "images/composers/${filename}", "master", byteArray, false)
				val scaledImage = imageService.scaleAndConvertImage(byteArray)

				println("Scaled image created as a PNG: " + scaledImage.size)

				val nameWithoutExtension = filename.cleanUp()

				// store the processed file in github
				gitService.createBinaryFile("v79", "rightnotes", "assets/images/scaled/${nameWithoutExtension}.png", "master", scaledImage, false)

				// TODO: deal with this error message:
				// org.kohsuke.github.HttpException: {"message":"Reference cannot be updated","documentation_url":"https://developer.github.com/v3/git/refs/#update-a-reference"}

				// transfer the processed file to S3 bucket
				val writtenToBucket = s3Service.writeToBucket("assets/images/scaled/${nameWithoutExtension}.png", scaledImage)

				if (writtenToBucket) {
					req.responseBuilder()
							.header(HttpHeaders.CONTENT_TYPE, contentTypeHeader)
							.header(HttpHeaders.CONTENT_LENGTH, scaledImage.size.toString())
							.build(scaledImage)
				} else {
					req.responseBuilder().status(HttpStatus.SC_INTERNAL_SERVER_ERROR)
				}
			}
		}
	}

	/**
	 * Get Spotify authentication token from client + secret key, specified in environment configuration
	 * @return acess_token as JSON
	 */
	auth(CognitoUserPoolsAuth) {
		get("/spotify-token") { req ->
			val spotifyClient = "4713cdaa7a21413a9ce0e6910ab8ec19";
			val x = spotifyClient + ":" + SPOTIFY_SECRET
			val spotifyAuth = Base64.getEncoder().encode(x.toByteArray()).toString(Charset.defaultCharset())

			val spotifyResponse = khttp.post("https://accounts.spotify.com/api/token", headers = mapOf(("Authorization" to "Basic $spotifyAuth"), ("Accept" to "application/json"), ("Content-Type" to "application/x-www-form-urlencoded"), ("Accept-Encoding" to "gzip")), data = "grant_type=client_credentials")

			if (spotifyResponse.statusCode == HttpStatus.SC_OK) {
				req.responseBuilder().status(HttpStatus.SC_OK).header("Content-Type", "text/plain").build(spotifyResponse.jsonObject.get("access_token"))
			} else {
				req.responseBuilder().status(HttpStatus.SC_UNAUTHORIZED)
			}
		}
	}

	auth(CognitoUserPoolsAuth) {
		get("/ordering") { req ->
			val orderFile = gitService.loadOrderFile("v79", "rightnotes", "order.txt", "master")
			if(orderFile.length > 0 ) {
				req.responseBuilder().status(HttpStatus.SC_OK).header("Content-Type","text/plain").build(orderFile)
			} else {
				req.responseBuilder().status(HttpStatus.SC_INTERNAL_SERVER_ERROR)
			}
		}
	}

	auth(CognitoUserPoolsAuth) {
		post("/update-order") { req ->
			val updatedList = req.body<String>()
			var appResponse: AppResponse
			if(updatedList.length > 0) {
				appResponse  = gitService.updateOrderingFile(userName = "v79", repoName = "rightnotes", path = "order.txt", data = updatedList, branchRef = "master")
			} else {
				appResponse = AppResponse(status = org.apache.http.HttpStatus.SC_INTERNAL_SERVER_ERROR,message = "Internal server error while attempting to update the ordering file")
			}
			appResponse
		}
	}

}

private fun String.cleanUp(): String {
	val WORD_SEPARATOR = "-"
	val leaf = this.substringBeforeLast(".").replace(" ", WORD_SEPARATOR)
	val titleCase = leaf.split(WORD_SEPARATOR).map { word ->
		if (word.isEmpty()) word else Character.toTitleCase(word[0]) + word.substring(1).toLowerCase()
	}.joinToString(WORD_SEPARATOR)
	return titleCase
}

private fun Request.returnHtml(body: String) =
		this.responseBuilder().status(HttpStatus.SC_OK).header("Content-Type", "text/html").build(body)

private fun Request.returnTextError(body: String) =
		this.responseBuilder().status(HttpStatus.SC_INTERNAL_SERVER_ERROR).header("Content-Type","text/plain").build(body)

interface RightNotesComponents : ComponentsProvider {
	val gitService: GitService
	val imageService: ImageProcessor
	val s3Service: S3Service
	val isLocal: Boolean
}

class RightNotesComponentsImpl : RightNotesComponents {
	override val gitService: GitService = GitService()
	override val imageService: ImageProcessor = ImageProcessor()
	override val s3Service: S3Service = S3Service()
	override val isLocal: Boolean
		get() = false
}

class RightNotesLocalImpl : RightNotesComponents {
	override val gitService: GitService = GitService()
	override val imageService: ImageProcessor = ImageProcessor()
	override val s3Service: S3Service = S3Service()
	override val isLocal: Boolean
		get() = true
}

fun createComponents(): RightNotesComponents = RightNotesComponentsImpl()
fun createLocalComponents() : RightNotesComponents = RightNotesLocalImpl() // when running locally, not on AWS


