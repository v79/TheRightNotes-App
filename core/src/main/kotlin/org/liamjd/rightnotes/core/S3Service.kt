package org.liamjd.rightnotes.core

import software.amazon.awssdk.awscore.exception.AwsServiceException
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.ObjectCannedACL
import software.amazon.awssdk.services.s3.model.PutObjectRequest

class S3Service {

	val bucket = "www.therightnotes.org"
	val metaDataKey = "Content-Type"
	val metaDataPNG = "image/png"

	fun writeToBucket(path: String, data: ByteArray): Boolean {

		val region = Region.EU_WEST_2
		val s3: S3Client = S3Client.builder().region(region).build()

		println("Writing object ${path} to S3 bucket ${bucket}")
		try {
			val putObject = s3.putObject(PutObjectRequest.builder().bucket(bucket).key(path).acl(ObjectCannedACL.PUBLIC_READ).contentType(metaDataPNG)
					.build(), RequestBody.fromBytes(data))
		} catch (awse: AwsServiceException) {
			println(awse.message)
			return false
		}
		return true
	}
}
