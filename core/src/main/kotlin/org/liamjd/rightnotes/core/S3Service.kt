package org.liamjd.rightnotes.core

import software.amazon.awssdk.awscore.exception.AwsServiceException
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.ObjectCannedACL
import software.amazon.awssdk.services.s3.model.PutObjectRequest

class S3Service {

	val bucket = "www.therightnotes.org"

	fun writeToBucket(path: String, data: ByteArray) {

		val region = Region.EU_WEST_2
		val s3: S3Client = S3Client.builder().region(region).build()

		println("Writing object ${path} to S3 bucket ${bucket}")
		try {
			s3.putObject(PutObjectRequest.builder().bucket(bucket).key(path).acl(ObjectCannedACL.PUBLIC_READ)
					.build(), RequestBody.fromBytes(data))
		} catch (awse: AwsServiceException) {
			println(awse.message)
		}

	}
}
