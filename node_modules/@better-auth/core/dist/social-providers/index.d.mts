import { AppleNonConformUser, AppleOptions, AppleProfile, apple, getApplePublicKey } from "./apple.mjs";
import { AtlassianOptions, AtlassianProfile, atlassian } from "./atlassian.mjs";
import { CloudflareOptions, CloudflareProfile, cloudflare } from "./cloudflare.mjs";
import { CognitoOptions, CognitoProfile, cognito, getCognitoPublicKey } from "./cognito.mjs";
import { DiscordOptions, DiscordProfile, discord } from "./discord.mjs";
import { FacebookGraphProfile, FacebookLimitedLoginProfile, FacebookOptions, FacebookProfile, facebook } from "./facebook.mjs";
import { FigmaOptions, FigmaProfile, figma } from "./figma.mjs";
import { GithubOptions, GithubProfile, github } from "./github.mjs";
import { MicrosoftEntraIDProfile, MicrosoftOptions, getMicrosoftPublicKey, microsoft } from "./microsoft-entra-id.mjs";
import { GoogleOptions, GoogleProfile, VerifyGoogleIdTokenOptions, getGooglePublicKey, google, isGoogleHostedDomainAllowed, verifyGoogleIdToken } from "./google.mjs";
import { HuggingFaceOptions, HuggingFaceProfile, huggingface } from "./huggingface.mjs";
import { SlackOptions, SlackProfile, slack } from "./slack.mjs";
import { SpotifyOptions, SpotifyProfile, spotify } from "./spotify.mjs";
import { TwitchOptions, TwitchProfile, twitch } from "./twitch.mjs";
import { TwitterOption, TwitterProfile, twitter } from "./twitter.mjs";
import { DropboxOptions, DropboxProfile, dropbox } from "./dropbox.mjs";
import { KickOptions, KickProfile, kick } from "./kick.mjs";
import { LinearOptions, LinearProfile, LinearUser, linear } from "./linear.mjs";
import { LinkedInOptions, LinkedInProfile, linkedin } from "./linkedin.mjs";
import { GitlabOptions, GitlabProfile, gitlab } from "./gitlab.mjs";
import { TiktokOptions, TiktokProfile, tiktok } from "./tiktok.mjs";
import { RedditOptions, RedditProfile, reddit } from "./reddit.mjs";
import { RobloxOptions, RobloxProfile, roblox } from "./roblox.mjs";
import { SalesforceOptions, SalesforceProfile, salesforce } from "./salesforce.mjs";
import { VkOption, VkProfile, vk } from "./vk.mjs";
import { AccountStatus, LoginType, PhoneNumber, PronounOption, ZoomOptions, ZoomProfile, zoom } from "./zoom.mjs";
import { NotionOptions, NotionProfile, notion } from "./notion.mjs";
import { KakaoOptions, KakaoProfile, kakao } from "./kakao.mjs";
import { NaverOptions, NaverProfile, naver } from "./naver.mjs";
import { LineIdTokenPayload, LineOptions, LineUserInfo, line } from "./line.mjs";
import { PaybinOptions, PaybinProfile, paybin } from "./paybin.mjs";
import { PayPalOptions, PayPalProfile, PayPalTokenResponse, paypal } from "./paypal.mjs";
import { PolarOptions, PolarProfile, polar } from "./polar.mjs";
import { RailwayOptions, RailwayProfile, railway } from "./railway.mjs";
import { VercelOptions, VercelProfile, vercel } from "./vercel.mjs";
import { WeChatOptions, WeChatProfile, wechat } from "./wechat.mjs";
import { AwaitableFunction } from "../types/helper.mjs";
import { OAuth2Tokens, OAuth2UserInfo, OAuthAccountKeyContext } from "../oauth2/oauth-provider.mjs";
import * as z from "zod";
import * as _$jose from "jose";

//#region src/social-providers/index.d.ts
declare const socialProviders: {
  apple: (options: AppleOptions) => {
    id: "apple";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<AppleProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams,
      codeVerifier
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    idToken: {
      jwks: (header: _$jose.JWTHeaderParameters) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
      issuer: string;
      audience: string | string[];
      maxTokenAge: string;
      nonceComparison: "exact-or-sha256";
    };
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: AppleProfile;
    } | null>;
    options: AppleOptions;
  };
  atlassian: (options: AtlassianOptions) => {
    id: "atlassian";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<AtlassianProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: AtlassianProfile;
    } | {
      user: {
        id?: never;
        name: string;
        email: string | null;
        image: string;
        emailVerified: boolean;
      };
      data: {
        account_id: string;
        name: string;
        email?: string | undefined;
        picture?: string | undefined;
      };
    } | null>;
    options: AtlassianOptions;
  };
  cloudflare: (options: CloudflareOptions) => {
    id: "cloudflare";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<CloudflareProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: CloudflareProfile;
    } | null>;
    options: CloudflareOptions;
  };
  cognito: (options: CognitoOptions) => {
    id: "cognito";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<CognitoProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    idToken: {
      jwks: (header: _$jose.JWTHeaderParameters) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
      issuer: string;
      audience: string | string[];
      maxTokenAge: string;
    };
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: CognitoProfile;
    } | {
      user: {
        id?: never;
        name: string;
        email: string | null;
        image: string;
        emailVerified: boolean;
      };
      data: {
        name: string;
        sub: string;
        email: string;
        email_verified: boolean;
        given_name?: string | undefined;
        family_name?: string | undefined;
        picture?: string | undefined;
        username?: string | undefined;
        locale?: string | undefined;
        phone_number?: string | undefined;
        phone_number_verified?: boolean | undefined;
        aud: string | (string & string[]);
        iss: string;
        exp: number;
        iat: number;
        jti?: string;
        nbf?: number;
      };
    } | null>;
    options: CognitoOptions;
  };
  discord: (options: DiscordOptions) => {
    id: "discord";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<DiscordProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: DiscordProfile;
    } | null>;
    options: DiscordOptions;
  };
  facebook: (options: FacebookOptions) => {
    id: "facebook";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<FacebookProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      loginHint,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    idToken: {
      jwks: {
        (protectedHeader?: _$jose.JWSHeaderParameters, token?: _$jose.FlattenedJWSInput): Promise<_$jose.CryptoKey>;
        coolingDown: boolean;
        fresh: boolean;
        reloading: boolean;
        reload: () => Promise<void>;
        jwks: () => _$jose.JSONWebKeySet | undefined;
      };
      issuer: string;
      audience: string | string[];
      algorithms: string[];
      allowOpaqueToken: true;
    };
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: FacebookProfile;
    } | null>;
    options: FacebookOptions;
  };
  figma: (options: FigmaOptions) => {
    id: "figma";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<FigmaProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: FigmaProfile;
    } | null>;
    options: FigmaOptions;
  };
  github: (options: GithubOptions) => {
    id: "github";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<GithubProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      loginHint,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens | null>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: GithubProfile;
    } | null>;
    options: GithubOptions;
  };
  microsoft: (options: MicrosoftOptions) => {
    id: "microsoft";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<MicrosoftEntraIDProfile>) => string;
    createAuthorizationURL(data: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }): Promise<OAuth2Tokens>;
    idToken: {
      jwks: (header: _$jose.JWTHeaderParameters) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
      audience: string | string[];
      maxTokenAge: string;
      issuer: string | undefined;
      verifyClaims: (claims: Record<string, unknown>) => boolean;
    };
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: MicrosoftEntraIDProfile;
    } | null>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    options: MicrosoftOptions;
  };
  google: (options: GoogleOptions) => {
    id: "google";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<GoogleProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      loginHint,
      display,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    idToken: {
      jwks: (header: _$jose.JWTHeaderParameters) => Promise<Uint8Array<ArrayBufferLike> | CryptoKey>;
      issuer: string[];
      audience: string | string[];
      maxTokenAge: string;
      verifyClaims: ((claims: Record<string, unknown>) => boolean) | undefined;
    };
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: GoogleProfile;
    } | null>;
    options: GoogleOptions;
  };
  huggingface: (options: HuggingFaceOptions) => {
    id: "huggingface";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<HuggingFaceProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: HuggingFaceProfile;
    } | null>;
    options: HuggingFaceOptions;
  };
  slack: (options: SlackOptions) => {
    id: "slack";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<SlackProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: SlackProfile;
    } | null>;
    options: SlackOptions;
  };
  spotify: (options: SpotifyOptions) => {
    id: "spotify";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<SpotifyProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: SpotifyProfile;
    } | null>;
    options: SpotifyOptions;
  };
  twitch: (options: TwitchOptions) => {
    id: "twitch";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<TwitchProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: TwitchProfile;
    } | null>;
    options: TwitchOptions;
  };
  twitter: (options: TwitterOption) => {
    id: "twitter";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<TwitterProfile>) => string;
    createAuthorizationURL(data: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: TwitterProfile;
    } | null>;
    options: TwitterOption;
  };
  dropbox: (options: DropboxOptions) => {
    id: "dropbox";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<DropboxProfile>) => string;
    createAuthorizationURL: ({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }) => Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: DropboxProfile;
    } | null>;
    options: DropboxOptions;
  };
  kick: (options: KickOptions) => {
    id: "kick";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<KickProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      codeVerifier,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode({
      code,
      redirectURI,
      codeVerifier
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }): Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: KickProfile;
    } | null>;
    options: KickOptions;
  };
  linear: (options: LinearOptions) => {
    id: "linear";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<LinearUser>) => string;
    createAuthorizationURL({
      state,
      scopes,
      loginHint,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: LinearUser;
    } | null>;
    options: LinearOptions;
  };
  linkedin: (options: LinkedInOptions) => {
    id: "linkedin";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<LinkedInProfile>) => string;
    createAuthorizationURL: ({
      state,
      scopes,
      redirectURI,
      loginHint,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }) => Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: LinkedInProfile;
    } | null>;
    options: LinkedInOptions;
  };
  gitlab: (options: GitlabOptions) => {
    id: "gitlab";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<GitlabProfile>) => number;
    createAuthorizationURL: ({
      state,
      scopes,
      codeVerifier,
      loginHint,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }) => Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI,
      codeVerifier
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: GitlabProfile;
    } | null>;
    options: GitlabOptions;
  };
  tiktok: (options: TiktokOptions) => {
    id: "tiktok";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<TiktokProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): URL;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: TiktokProfile;
    } | null>;
    options: TiktokOptions;
  };
  reddit: (options: RedditOptions) => {
    id: "reddit";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<RedditProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: RedditProfile;
    } | null>;
    options: RedditOptions;
  };
  roblox: (options: RobloxOptions) => {
    id: "roblox";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<RobloxProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: RobloxProfile;
    } | null>;
    options: RobloxOptions;
  };
  salesforce: (options: SalesforceOptions) => {
    id: "salesforce";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<SalesforceProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: SalesforceProfile;
    } | null>;
    options: SalesforceOptions;
  };
  vk: (options: VkOption) => {
    id: "vk";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<VkProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI,
      deviceId
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(data: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: VkProfile;
    } | null>;
    options: VkOption;
  };
  zoom: (userOptions: ZoomOptions) => {
    id: "zoom";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<ZoomProfile>) => string;
    createAuthorizationURL: ({
      state,
      redirectURI,
      codeVerifier,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }) => Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI,
      codeVerifier
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: ZoomProfile;
    } | null>;
  };
  notion: (options: NotionOptions) => {
    id: "notion";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<NotionProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      loginHint,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: NotionProfile;
    } | null>;
    options: NotionOptions;
  };
  kakao: (options: KakaoOptions) => {
    id: "kakao";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<KakaoProfile>) => number;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: KakaoProfile;
    } | {
      user: {
        id?: never;
        name: string;
        email: string | null;
        image: string;
        emailVerified: boolean;
      };
      data: KakaoProfile;
    } | null>;
    options: KakaoOptions;
  };
  naver: (options: NaverOptions) => {
    id: "naver";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<NaverProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: NaverProfile;
    } | {
      user: {
        id?: never;
        name: string;
        email: string | null;
        image: string;
        emailVerified: boolean;
      };
      data: NaverProfile;
    } | null>;
    options: NaverOptions;
  };
  line: (options: LineOptions) => {
    id: "line";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<LineIdTokenPayload | LineUserInfo>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      loginHint,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    idToken: {
      verify: (token: string, nonce: string | undefined) => Promise<boolean>;
    };
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: LineIdTokenPayload | LineUserInfo;
    } | null>;
    options: LineOptions;
  };
  paybin: (options: PaybinOptions) => {
    id: "paybin";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<PaybinProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      loginHint,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: PaybinProfile;
    } | null>;
    options: PaybinOptions;
  };
  paypal: (options: PayPalOptions) => {
    id: "paypal";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<PayPalProfile>) => string;
    createAuthorizationURL({
      state,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: PayPalProfile;
    } | {
      user: {
        id?: never;
        name: string;
        email: string | null;
        image: string;
        emailVerified: boolean;
      };
      data: PayPalProfile;
    } | null>;
    options: PayPalOptions;
  };
  polar: (options: PolarOptions) => {
    id: "polar";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<PolarProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: PolarProfile;
    } | null>;
    options: PolarOptions;
  };
  railway: (options: RailwayOptions) => {
    id: "railway";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<RailwayProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    refreshAccessToken: (refreshToken: string) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: RailwayProfile;
    } | null>;
    options: RailwayOptions;
  };
  vercel: (options: VercelOptions) => {
    id: "vercel";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<VercelProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      codeVerifier,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): Promise<URL>;
    validateAuthorizationCode: ({
      code,
      codeVerifier,
      redirectURI
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<OAuth2Tokens>;
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: VercelProfile;
    } | null>;
    options: VercelOptions;
  };
  wechat: (options: WeChatOptions) => {
    id: "wechat";
    name: string;
    accountSubject: ({
      profile
    }: OAuthAccountKeyContext<WeChatProfile>) => string;
    createAuthorizationURL({
      state,
      scopes,
      redirectURI,
      additionalParams
    }: {
      state: string;
      codeVerifier: string;
      scopes?: string[] | undefined;
      redirectURI: string;
      display?: string | undefined;
      loginHint?: string | undefined;
      idTokenNonce?: string | undefined;
      additionalParams?: Record<string, string> | undefined;
    }): URL;
    validateAuthorizationCode: ({
      code
    }: {
      code: string;
      redirectURI: string;
      codeVerifier?: string | undefined;
      deviceId?: string | undefined;
    }) => Promise<{
      tokenType: "Bearer";
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: Date;
      scopes: string[];
      openid: string;
      unionid: string | undefined;
    }>;
    refreshAccessToken: ((refreshToken: string) => Promise<OAuth2Tokens>) | ((refreshToken: string) => Promise<{
      tokenType: "Bearer";
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: Date;
      scopes: string[];
    }>);
    getUserInfo(token: OAuth2Tokens & {
      expectedIdTokenNonce?: string | undefined;
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      } | undefined;
    }): Promise<{
      user: OAuth2UserInfo & Record<string, unknown>;
      data: WeChatProfile;
    } | null>;
    options: WeChatOptions;
  };
};
declare const socialProviderList: ["github", ...(keyof typeof socialProviders)[]];
declare const SocialProviderListEnum: z.ZodType<SocialProviderList[number] | (string & {})>;
type SocialProvider = z.infer<typeof SocialProviderListEnum>;
type SocialProviders = { [K in SocialProviderList[number]]?: AwaitableFunction<Parameters<(typeof socialProviders)[K]>[0] & {
  enabled?: boolean | undefined;
}> };
type SocialProviderList = typeof socialProviderList;
//#endregion
export { AccountStatus, AppleNonConformUser, AppleOptions, AppleProfile, AtlassianOptions, AtlassianProfile, CloudflareOptions, CloudflareProfile, CognitoOptions, CognitoProfile, DiscordOptions, DiscordProfile, DropboxOptions, DropboxProfile, FacebookGraphProfile, FacebookLimitedLoginProfile, FacebookOptions, FacebookProfile, FigmaOptions, FigmaProfile, GithubOptions, GithubProfile, GitlabOptions, GitlabProfile, GoogleOptions, GoogleProfile, HuggingFaceOptions, HuggingFaceProfile, KakaoOptions, KakaoProfile, KickOptions, KickProfile, LineIdTokenPayload, LineOptions, LineUserInfo, LinearOptions, LinearProfile, LinearUser, LinkedInOptions, LinkedInProfile, LoginType, MicrosoftEntraIDProfile, MicrosoftOptions, NaverOptions, NaverProfile, NotionOptions, NotionProfile, PayPalOptions, PayPalProfile, PayPalTokenResponse, PaybinOptions, PaybinProfile, PhoneNumber, PolarOptions, PolarProfile, PronounOption, RailwayOptions, RailwayProfile, RedditOptions, RedditProfile, RobloxOptions, RobloxProfile, SalesforceOptions, SalesforceProfile, SlackOptions, SlackProfile, SocialProvider, SocialProviderList, SocialProviderListEnum, SocialProviders, SpotifyOptions, SpotifyProfile, TiktokOptions, TiktokProfile, TwitchOptions, TwitchProfile, TwitterOption, TwitterProfile, VercelOptions, VercelProfile, VerifyGoogleIdTokenOptions, VkOption, VkProfile, WeChatOptions, WeChatProfile, ZoomOptions, ZoomProfile, apple, atlassian, cloudflare, cognito, discord, dropbox, facebook, figma, getApplePublicKey, getCognitoPublicKey, getGooglePublicKey, getMicrosoftPublicKey, github, gitlab, google, huggingface, isGoogleHostedDomainAllowed, kakao, kick, line, linear, linkedin, microsoft, naver, notion, paybin, paypal, polar, railway, reddit, roblox, salesforce, slack, socialProviderList, socialProviders, spotify, tiktok, twitch, twitter, vercel, verifyGoogleIdToken, vk, wechat, zoom };