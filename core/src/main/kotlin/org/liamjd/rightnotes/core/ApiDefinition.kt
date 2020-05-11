package org.liamjd.rightnotes.core

import kotlinx.html.*
import kotlinx.html.dom.createHTMLDocument
import kotlinx.html.dom.serialize
import kotlinx.io.ByteArrayOutputStream
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonConfiguration
import org.apache.http.HttpStatus
import ws.osiris.core.*
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO


private val imageMimeTypes: Set<String> = setOf(
		"image/png",
		"image/jpeg",
		"image/jfif"
)

private val DRAFT = "__"

val api = api<RightNotesComponents> {

	staticFiles {
		path = "/"
		indexFile = "index.html"
	}

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

	post("/load-markdown") { req ->
		val fileToLoad = req.body<String>()
		println("Loading markdown file $fileToLoad")
		val markdown = gitService.loadMarkdownFile("v79", "rightnotes", fileToLoad, "master")
		if (markdown.path.isNotEmpty()) {
			val json = Json(JsonConfiguration.Stable)
			val jsonData = json.stringify(BasculePost.serializer(), markdown)

			jsonData
		} else {
			req.responseBuilder().status(HttpStatus.SC_NO_CONTENT).build()
		}

	}

	post("/save-new-file") { req ->
		val postContents = req.body<String>()
		val json = Json(JsonConfiguration.Stable)
		val yamlPost = json.parse(FromJson.serializer(), postContents)
		println(yamlPost)
		// need to sanitise the file name?
		// prepending "__" makes it a draft file
		val fileName = DRAFT + yamlPost.title.replace(Regex("\\W")," ").trim() + ".md"
		val result = gitService.createNewFile("v79", "rightnotes", "sources/${fileName}", "master", yamlPost, false)
		val status = if(result) HttpStatus.SC_CREATED else HttpStatus.SC_INTERNAL_SERVER_ERROR
		req.responseBuilder().status(status).build(fileName)
	}

	post("/save-and-update") { req ->
		println("Going to update existing file")
		val postContents = req.body<String>()
		val json = Json(JsonConfiguration.Stable)
		val yamlPost = json.parse(FromJson.serializer(), postContents)

		gitService.updateFile("v79","rightnotes","${yamlPost.path}","master",yamlPost)
		""
	}

	get("/image-list") { req ->
		val imageList = gitService.getGitHubFileList("v79", "rightnotes", "assets/images/scaled", "master")
		val galleryList = mutableListOf<GalleryImage>()
		imageList.forEach { sourceFile ->
			galleryList.add(GalleryImage(sourceFile.name, "https://www.therightnotes.org/assets/images/scaled/${sourceFile.name}",sourceFile.size))
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

	post("/release-from-draft") { req ->
		val pathToRelease = req.body<String>();
		println("Attempting to release $pathToRelease from draft status")
		""
	}

	post("/upload-image") { req ->
		val contentTypeHeader = req.headers[HttpHeaders.CONTENT_TYPE]
		val contentDispositionHeader = req.headers["Content-Disposition"]
		val filename = contentDispositionHeader.removePrefix("attachment; filename=\"").removeSuffix("\"")
		val (mimeType, _) = ContentType.parse(contentTypeHeader)
		if (!imageMimeTypes.contains(mimeType)) {
			println("Content-Type must be one of $imageMimeTypes")
			req.responseBuilder().status(HttpStatus.SC_BAD_REQUEST).header("Content-Type","text/plain").build("Image must be a JPG, PNG or JFIF file.")

		} else {
			val image = ImageIO.read(ByteArrayInputStream(req.requireBinaryBody()))
			println("Upload image called with ${filename}, ${mimeType}, ${req.requireBinaryBody().size} bytes")
			val formatName = mimeType.substring(mimeType.indexOf('/') + 1)
			val outputStream = ByteArrayOutputStream()
			ImageIO.write(image, formatName, outputStream)
			val byteArray = outputStream.toByteArray()

			// store the original in git images folder first
			gitService.createBinaryFile("v79","rightnotes","images/composers/${filename}","master",byteArray,false)
			val scaledImage = imageService.scaleAndConvertImage(byteArray)

			println("Scaled image created as a PNG: " +scaledImage.size)

			val nameWithoutExtension = filename.cleanUp()

			// store the processed file in github
			gitService.createBinaryFile("v79","rightnotes","assets/images/scaled/${nameWithoutExtension}.png","master",scaledImage,false)

			// transfer the processed file to S3 bucket
			s3Service.writeToBucket("assets/images/scaled/${nameWithoutExtension}.png",scaledImage)

			req.responseBuilder()
					.header(HttpHeaders.CONTENT_TYPE, contentTypeHeader)
					.header(HttpHeaders.CONTENT_LENGTH, scaledImage.size.toString())
					.build(scaledImage)
		}
	}

}

private fun String.cleanUp(): String {
	val WORD_SEPARATOR = "-"
	val leaf = this.substringBeforeLast(".").replace(" ",WORD_SEPARATOR)
	val titleCase = leaf.split(WORD_SEPARATOR).map { word ->
		if(word.isEmpty()) word else Character.toTitleCase(word[0]) + word.substring(1).toLowerCase()
	}.joinToString(WORD_SEPARATOR)
	return titleCase
}

private fun Request.returnHtml(body: String) =
		this.responseBuilder().status(200).header("Content-Type", "text/html").build(body)

interface RightNotesComponents : ComponentsProvider {
	val gitService: GitService
	val imageService: ImageProcessor
	val s3Service: S3Service
}

class RightNotesComponentsImpl : RightNotesComponents {
	override val gitService: GitService = GitService()
	override val imageService: ImageProcessor = ImageProcessor()
	override val s3Service: S3Service = S3Service()
}

fun createComponents(): RightNotesComponents = RightNotesComponentsImpl()


