package org.liamjd.rightnotes.localserver

import com.beust.jcommander.JCommander
import ws.osiris.localserver.ServerArgs
import ws.osiris.localserver.runLocalServer

import org.liamjd.rightnotes.core.api
import org.liamjd.rightnotes.core.createComponents
import org.apache.http.HttpStatus

/**
 * Main function for running the application in an HTTP server (Jetty).
 *
 * The arguments are:
 *   * `-p`, `--port` - the port the server listens on. Defaults to 8080.
 *   * `-r`, `--root` - the context root. This is the base path from which everything is served.
 */
fun main(args: Array<String>) {
    val serverArgs = ServerArgs()
    JCommander.newBuilder().addObject(serverArgs).build().parse(*args)
    val components = createComponents()
    runLocalServer(api, components, serverArgs.port, serverArgs.root, "core/src/main/static")
}
