package org.liamjd.rightnotes.core

import ws.osiris.aws.ApplicationConfig
import ws.osiris.aws.AuthConfig
import ws.osiris.aws.Stage
import java.time.Duration

/**
 * Configuration that controls how the application is deployed to AWS.
 */
val config = ApplicationConfig(
		applicationName = "TheRightNotes-App",
		applicationDescription = "Collection of REST services to create and edit posts, and upload images",
		lambdaMemorySizeMb = 512,
		lambdaTimeout = Duration.ofSeconds(30),
		environmentVariables = mapOf(
				"GIT_AUTH_TOKEN" to System.getenv("GIT_AUTH_TOKEN"),
				"SPOTIFY_SECRET" to System.getenv("SPOTIFY_SECRET")
		),
		authConfig = AuthConfig.CognitoUserPools("arn:aws:cognito-idp:eu-west-2:086949310404:userpool/eu-west-2_NN6UXKr5p"),
		stages = listOf(
				Stage(
						name = "dev",
						description = "Development stage",
						deployOnUpdate = true,
						variables = mapOf(
								"dev" to "true",
								"VAR2" to "devValue2"
						)
				),
				Stage(
						name = "prod",
						description = "Production stage",
						deployOnUpdate = false,
						variables = mapOf(
								"dev" to "false",
								"VAR2" to "prodValue2"
						)
				)
		)
)
