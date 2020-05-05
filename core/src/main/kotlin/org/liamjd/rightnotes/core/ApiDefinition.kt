package org.liamjd.rightnotes.core

import kotlinx.html.*
import kotlinx.html.dom.createHTMLDocument
import kotlinx.html.dom.serialize
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonConfiguration
import ws.osiris.core.Request
import ws.osiris.core.api


val api = api<GitService> {

	staticFiles {
		path = "/"
		indexFile = "index.html"
	}

	get("/post-list") { req ->
		val repoFiles = getPostList("v79", "rightnotes", "sources", "master")
		val postList = createHTMLDocument().ul {
			repoFiles.forEach { sourceFile ->
				val kb = if (sourceFile.fileSize != null) sourceFile.fileSize / 1024 else 0L
				li("file") {
					span(classes = "post-list-item") {
						onClick = "loadMarkdownFile('${sourceFile.source}')"
						title = "$kb kb"
						+sourceFile.name.removePrefix("_")
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
		val markdown = loadMarkdownFile("v79", "rightnotes", "$fileToLoad", "master")
		val json = Json(JsonConfiguration.Stable)
		val jsonData = json.stringify(BasculePost.serializer(), markdown)

		jsonData
	}

	post("/save-new-file") { req ->
		val postContents = req.body<String>()
		val json = Json(JsonConfiguration.Stable)
		val yamlPost = json.parse(FromJson.serializer(), postContents)
		println(yamlPost)
		// need to sanitise the file name?
		// prepending "_" makes it a draft file
		createNewFile("v79", "rightnotes", "sources/_${yamlPost.title}.md", "master", yamlPost, false)
		""
	}

	get("/image-list") { req ->
		val imageList = getGitHubFileList("v79", "rightnotes", "assets/images/scaled", "master")

//		val fakeImages = arrayListOf<String>("Louise-Farrenc.png", "Middle-aged-Richard-Strauss.png", "Aaron-Copland.png", "Dvorak.png")
		val imageGallery = createHTMLDocument().ul(classes = "portrait-list") {
			imageList.forEach { sourceFile ->
				li {
					figure(classes = "image is-96x96 is-rounded gallery-figure") {
						img {
							draggable = Draggable.htmlTrue
							alt = sourceFile.name
							src = "https://www.therightnotes.org/assets/images/scaled/${sourceFile.name}"
							title = sourceFile.name
							onDragStart = "dragstart_handler(event);"
							onDragEnd = "dragend_handler(event);"
						}
						figcaption(classes = "is-small") {
							+sourceFile.name
						}
					}
				}
			}
		}
		req.returnHtml(imageGallery.serialize(true))
	}

	post("/release-from-draft") { req ->
		val pathToRelease = req.body<String>();
		println("Attempting to release $pathToRelease from draft status")
		""
	}

}

private fun Request.returnHtml(body: String) =
		this.responseBuilder().status(200).header("Content-Type", "text/html").build(body)

fun createComponents() = GitService()

// is this really needed? Could just use FromGithub, below, instead?
@Serializable
class BasculePost(val filename: String, val title: String, val body: String, val slug: String, val playlist: String, val summary: String, val composers: List<String>, val genres: List<String>)

/**
 * Oh what a tangled web we weave, when first we practice to deceive...
 */
@Serializable
class FromGithub(val title: String, val slug: String, val playlist: String?, val summary: String?, val composers: List<String>, val genres: List<String>) {
	var body: String? = null
}

@Serializable
class FromJson(val title: String, val slug: String, val playlist: String?, val summary: String?, @SerialName("composers[]") val composers: List<String>?, @SerialName("genres[]") val genres: List<String>?) {

	var body: String? = null

	fun toMarkdown(): String {
		val sb = StringBuilder()
		sb.appendln("---")
		sb.appendln("title: $title")
		sb.appendln("slug: $slug")
		sb.appendln("author: T W Davison")
		sb.appendln("layout: post")
		// TODO: sb.appendln("date: DATE")
		sb.appendln("playlist: $playlist")

		sb.append("genres: [")
		genres?.forEachIndexed { i, g ->
			sb.append(g)
			if (i != genres.size - 1) {
				sb.append(",")
			}
		}
		sb.appendln("]")
		sb.append("composers: [")
		composers?.forEachIndexed { i, c ->
			sb.append(c)
			if (i != composers.size - 1) {
				sb.append(",")
			}
		}
		sb.appendln("]")
		sb.appendln("summary: $summary")
		sb.appendln("---")
		sb.appendln(body)
		return sb.toString()
	}
}

data class GHSourceFile(val name: String, val source: String, val draft: Boolean, val fileSize: Long?)


