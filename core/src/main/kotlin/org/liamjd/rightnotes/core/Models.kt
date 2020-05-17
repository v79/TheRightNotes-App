package org.liamjd.rightnotes.core

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// is this really needed? Could just use FromGithub, below, instead?
@Serializable
class BasculePost(val path: String, val title: String, val body: String, val slug: String, val playlist: String, val summary: String, val composers: List<String>, val genres: List<String>)

/**
 * Oh what a tangled web we weave, when first we practice to deceive...
 */
@Serializable
class FromGithub(val title: String, val slug: String, val playlist: String?, val summary: String?, val composers: List<String>, val genres: List<String>) {
	var body: String? = null
}

@Serializable
class FromJson(val title: String, val slug: String, val playlist: String?, val summary: String?, @SerialName("composers[]") val composers: List<String>?, @SerialName("genres[]") val genres: List<String>?, val body: String?, val path: String?) {

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

@Serializable
data class Gallery(val imageList: List<GalleryImage>)

@Serializable
data class GalleryImage(val filename: String, val url: String, val size: Long)

data class SpotifyAccessToken(val access_token: String, val expires_in: Int)

@Serializable
data class AppResponse(var status: Int, var message: String? = "") {
	val timestamp: Long
	init {
		timestamp = System.currentTimeMillis();
	}
}
