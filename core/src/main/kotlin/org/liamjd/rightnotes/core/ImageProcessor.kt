package org.liamjd.rightnotes.core

import kotlinx.io.ByteArrayOutputStream
import java.awt.AlphaComposite
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import javax.imageio.ImageIO
import kotlin.math.roundToInt


class ImageProcessor {

	private val WIDTH = 220

	fun scaleAndConvertImage(byteArray: ByteArray) : ByteArray {
		val sourceImage = ImageIO.read(byteArray.inputStream())
		println("Scaling image from ${byteArray.size} bytes")
		val resizedImage = resizeImageWithHint(sourceImage,sourceImage.type)
		val buffer = ByteArrayOutputStream()
		ImageIO.write(resizedImage,"png",buffer)
		return buffer.toByteArray()
	}

	private fun resizeImageWithHint(source: BufferedImage, type: Int): BufferedImage {
		val heightScale: Int = ((WIDTH.toFloat() / source.width.toFloat()) * source.height).roundToInt()
		println("New image size will be ${WIDTH}x${heightScale}")
		val resizedImage = BufferedImage(WIDTH,heightScale,type)

		val g = resizedImage.createGraphics()
		g.drawImage(source,0,0,WIDTH,heightScale,null)
		g.dispose()
		g.setComposite(AlphaComposite.Src)
		g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
		g.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY)
		g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON)

		println("Image resized from ${source.width}x${source.height} to ${resizedImage.width}x${resizedImage.height}")
		return resizedImage
	}
}

