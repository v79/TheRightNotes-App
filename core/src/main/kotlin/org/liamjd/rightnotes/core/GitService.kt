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
			val github = GitHub.connectUsingOAuth(GIT_AUTH_TOKEN)
			val repo = github.getRepository("$userName/$repoName")
			val content = repo.getFileContent(path, branchRef)
			val iStream = content.read()
			val markdown = iStream.bufferedReader(Charset.defaultCharset()).readText()
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
			return ServiceError(error = true,summary = "Unable to open file '$path', an exception was thrown.", detail = mye.message)
		} catch (ioe: IOException) {
			println(ioe)
			return ServiceError(error = true,summary = "Unable to open file '$path', an exception was thrown.", detail = ioe.message)
		}
		// TODO : Return something more meaningful if there is no valid post?
		return ServiceError(true,"Unknown error in loading file '$path'")
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
				treeBuilder.add(path,data , false)
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

	fun updateFile(userName: String,repoName: String,path: String,branchRef: String,data: FromJson,test: Boolean = false): AppResponse {
		var appResponse: AppResponse
		println("Attempting to commit $path to $repoName on branch $branchRef")
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
						.message("TheRightNotes-App: Updating existing file $path")
						.create()
				ref.updateTo(commit.shA1)
				appResponse = AppResponse(HttpStatus.SC_OK,path);
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
			val lastTree = repo.getTreeRecursive(latestCommit.shA1,1)

			val originalBlob = lastTree.getEntry(path).asBlob()

		} catch (ioe: IOException) {
			println(ioe)
		}
	}

}

