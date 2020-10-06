package org.liamjd.rightnotes.core

import com.charleskorn.kaml.MalformedYamlException
import com.charleskorn.kaml.Yaml
import com.charleskorn.kaml.YamlConfiguration
import org.kohsuke.github.*
import ws.osiris.core.ComponentsProvider
import java.io.IOException
import java.nio.charset.Charset
import org.apache.http.HttpStatus

class GitService : ComponentsProvider {
	private val GIT_AUTH_TOKEN: String
	private val DRAFT = "__"

	init {
		GIT_AUTH_TOKEN = System.getenv("GIT_AUTH_TOKEN")
	}

	//user/reponame
	fun getPostList(userName: String, repoName: String, path: String, branchRef: String): List<GHSourceFile> {
		val postList = mutableListOf<GHSourceFile>()
		try {
			val contentList = getGitHubFileList(userName, repoName, path, branchRef)
			contentList.filter { it.name.endsWith(".md", true) }.forEach { postList.add(GHSourceFile(it.name, it.path, it.name.startsWith(DRAFT), it.size)) }
			return postList
		} catch (ioe: IOException) {
			println(ioe)
		}
		return emptyList()
	}

	/**
	 * List all the files in Github repository under path [path] for given branch [branchRef]
	 */
	fun getGitHubFileList(userName: String, repoName: String, path: String, branchRef: String): List<GHContent> {
		try {
			val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
			val repo = github.getRepository("$userName/$repoName")
			val contentList = repo.getDirectoryContent(path, branchRef)

			return contentList.toList();
		} catch (ioe: IOException) {
			println(ioe)
		}
		return emptyList()
	}

	/**
	 * Load a file with the given [path]
	 */
	fun loadMarkdownFile(userName: String, repoName: String, path: String, branchRef: String): GitResponse {
		println("Loading file '$path'")
		try {
			val markdown = loadTextFile(userName, repoName, path, branchRef)
			val yaml = markdown.substringBeforeLast("---").substringAfter("---")
			val bodyText = markdown.substringAfterLast("---").trimStart()

			val notStrict = YamlConfiguration(true, false)
			val post = Yaml(configuration = notStrict).parse(FromGithub.serializer(), yaml)
			post.body = bodyText

			return BasculePost(
					path = path,
					title = post.title,
					layout = post.layout,
					body = bodyText,
					slug = post.slug,
					playlist = post.playlist
							?: "",
					summary = post.summary
							?: "",
					composers = post.composers,
					genres = post.genres
			)
		} catch (mye: MalformedYamlException) {
			println(mye)
			return ServiceError(error = true, summary = "Unable to open file '$path', an exception was thrown.", detail = mye.message)
		} catch (ioe: IOException) {
			println(ioe)
			return ServiceError(error = true, summary = "Unable to open file '$path', an exception was thrown.", detail = ioe.message)
		}
		// TODO : Return something more meaningful if there is no valid post?
		return ServiceError(true, "Unknown error in loading file '$path'")
	}

	/**
	 * Create a new file at the given [path]
	 */
	fun createNewFile(userName: String, repoName: String, path: String, branchRef: String, data: FromJson, test: Boolean): Boolean {
		var success = false;
		if (!test) {
			try {
				val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
				val repo = github.getRepository("$userName/$repoName")
				val ref: GHRef = repo.getRef("heads/$branchRef")
				val latestCommit: GHCommit = repo.getCommit(ref.getObject().sha)
				val treeBuilder: GHTreeBuilder = repo.createTree().baseTree(latestCommit.tree.sha)
				treeBuilder.add(path, data.toMarkdown(), false)
				val tree = treeBuilder.create()
				val commit: GHCommit = repo.createCommit()
						.parent(latestCommit.shA1)
						.tree(tree.sha)
						.message("TheRightNotes-App: Creating draft file $path")
						.create()
				ref.updateTo(commit.shA1)
				success = true
			} catch (ioe: IOException) {
				println(ioe)
			}
		} else {
			println("TEST: was going to save, but didn't")
			println(data.toMarkdown())
			success = false
		}
		return success
	}

	/**
	 * Create a new binary file at the given [path] containing the bytes held in [data]
	 * If [test] is true no write will happen
	 */
	fun createBinaryFile(userName: String, repoName: String, path: String, branchRef: String, data: ByteArray, test: Boolean): Boolean {
		println("Attempting to write binary file to ${path} with ${data.size} bytes")
		var success = false;
		if (!test) {
			try {
				val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
				val repo = github.getRepository("$userName/$repoName")
				val ref: GHRef = repo.getRef("heads/$branchRef")
				val latestCommit: GHCommit = repo.getCommit(ref.getObject().sha)
				val treeBuilder: GHTreeBuilder = repo.createTree().baseTree(latestCommit.tree.sha)
				treeBuilder.add(path, data, false)
				val tree = treeBuilder.create()
				val commit: GHCommit = repo.createCommit()
						.parent(latestCommit.shA1)
						.tree(tree.sha)
						.message("TheRightNotes-App: Creating binary file $path")
						.create()
				ref.updateTo(commit.shA1)
				success = true
			} catch (ioe: IOException) {
				println(ioe)
			}
		} else {
			println("TEST: was going to save, but didn't")
			success = false
		}
		return success
	}

	/**
	 * Update an existing text file with the given [path]
	 * File to save will be a JSON file supplied in [data] and converted to Markdown
	 * If [test] is true no file will be written
	 * Returns [AppResponse] object with status SC_OK if successful, or SC_BAD_REQUEST if failed
	 */
	fun updateMarkdownFile(userName: String, repoName: String, path: String, branchRef: String, data: FromJson, test: Boolean = false): AppResponse {
		return updateFile(userName, repoName, path, branchRef, data.toMarkdown(), test)
	}

	/**
	 * Update an existing text file with the given [path]
	 * File to save will supplied in [data]
	 * If [test] is true no file will be written
	 * Returns [AppResponse] object with status SC_OK if successful, or SC_BAD_REQUEST if failed
	 */
	private fun updateFile(userName: String, repoName: String, path: String, branchRef: String, data: String, test: Boolean = false): AppResponse {
		var appResponse: AppResponse
		println("Attempting to commit $path to $repoName on branch $branchRef")
		if (!test) {
			try {
				val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
				val repo = github.getRepository("$userName/$repoName")
				val ref: GHRef = repo.getRef("heads/$branchRef")
				val latestCommit: GHCommit = repo.getCommit(ref.getObject().sha)
				val treeBuilder: GHTreeBuilder = repo.createTree().baseTree(latestCommit.tree.sha)
				treeBuilder.add(path, data, false)
				val tree = treeBuilder.create()
				val commit: GHCommit = repo.createCommit()
						.parent(latestCommit.shA1)
						.tree(tree.sha)
						.message("TheRightNotes-App: Updating existing file $path")
						.create()
				ref.updateTo(commit.shA1)
				appResponse = AppResponse(HttpStatus.SC_OK, path);
			} catch (ioe: IOException) {
				appResponse = AppResponse(HttpStatus.SC_BAD_REQUEST)
				appResponse.message = ioe.message
				println(ioe)
			}
		} else {
			println("TEST: was going to save, but didn't")
			appResponse = AppResponse(HttpStatus.SC_NOT_IMPLEMENTED)
			appResponse.message = "Call was made in test mode; nothing was saved."
		}
		return appResponse
	}

	fun renameFile(userName: String, repoName: String, path: String, branchRef: String) {
		// I don't know how to do this...
		try {
			val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
			val repo = github.getRepository("$userName/$repoName")
			val content = repo.getFileContent(path, branchRef)
			val ref: GHRef = repo.getRef("heads/$branchRef")
			val latestCommit: GHCommit = repo.getCommit(ref.getObject().sha)
			val lastTree = repo.getTreeRecursive(latestCommit.shA1, 1)
			val originalBlob = lastTree.getEntry(path).asBlob()

		} catch (ioe: IOException) {
			println(ioe)
		}
	}

	/**
	 * Load the post ordering file from git
	 */
	fun loadOrderFile(userName: String, repoName: String, path: String, branchRef: String): String {
		println("Attempting to fetch ordering file '$path'")
		try {
			return loadTextFile(userName, repoName, path, branchRef)
			// TODO: error handling with AppResponse

		} catch (ioe: IOException) {
			println(ioe)
		}
		return ""
	}

	/**
	 * Save and update the post ordering file named [path] with given [data]
	 * If [test] is true, no data will be written
	 */
	fun updateOrderingFile(userName: String, repoName: String, path: String, data: String, branchRef: String): AppResponse {
		return updateFile(userName = userName, repoName = repoName, path = path, branchRef = branchRef, data = data, test = false)
	}

	/**
	 * Load a text file with the given [path]
	 */
	private fun loadTextFile(userName: String, repoName: String, path: String, branchRef: String): String {
		val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
		val repo = github.getRepository("$userName/$repoName")
		val content = repo.getFileContent(path, branchRef)
		val iStream = content.read()
		val textFile = iStream.bufferedReader(Charset.defaultCharset()).readText()
		return textFile
	}


}

