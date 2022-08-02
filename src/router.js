import httpUrlEncodeBodyParser from '@middy/http-urlencode-body-parser';
import {
	cors,
	httpHeaderNormalizer,
} from 'middy/middlewares';
import { Router, RouteBuilder } from '@clarityhub/serverless-simple-router';

import ActivityController from './domains/activities/ActivityController';
import PersonaController from './domains/personas/PersonaController';
import IntegrationController from './domains/integrations/IntegrationController';
import InterviewController from './domains/interviews/InterviewController';
import InterviewV2Controller from './domains/interviewsV2/InterviewV2Controller';
import MediaController from './domains/medias/MediaController';
import OnboardingController from './domains/onboarding/OnboardingController';
import PlanUsageController from './domains/plans/PlanUsageController';
import TagController from './domains/tags/TagController';
import TagItemController from './domains/tags/TagItemController';
import WorkspaceController from './domains/workspaces/WorkspaceController';
import WorkspaceUsersController from './domains/workspaces/WorkspaceUsersController';
import BillingController from './domains/billing/BillingController';
import getUser from './middleware/getUser';
import hasActiveSubscription from './middleware/hasActiveSubscription';
import getAuth0User from './middleware/getAuth0User';
import AuthController from './domains/auth/AuthController';
import StripeWebhookController from './domains/billing/StripeWebhookController';
import VideoCallController from './domains/videoCalls/VideoCallController';
import TwilioWebhookController from './domains/videoCalls/TwilioWebhookController';

import wrapBottle from './middleware/wrapBottle';
import bodyParser from './middleware/bodyParser';
import httpSuccessHandler from './middleware/httpSuccessHandler';
import httpErrorHandler from './middleware/httpErrorHandler';
import hasAccess from './middleware/hasAccess';
import getStripeContext from './middleware/getStripeContext';

const routes = new Router();

const mid = [
	httpErrorHandler,
	cors,
	httpHeaderNormalizer,
	wrapBottle,
	bodyParser,
	httpSuccessHandler,
];

const rbac = hasAccess;

routes.post('/auth/login', RouteBuilder.method(AuthController, 'loginUser', [...mid, getAuth0User()]));
routes.post('/auth/login/workspace', RouteBuilder.method(AuthController, 'loginWorkspace', [...mid, getAuth0User()]));
routes.post('/auth/refresh', RouteBuilder.method(AuthController, 'refresh', [...mid, getUser(), rbac]));
routes.put('/auth/me/metadata', RouteBuilder.method(AuthController, 'updateMeta', [...mid, getUser(), rbac]));

// Workspaces requires special middleware depending on the route
routes.get('/workspaces', RouteBuilder.method(WorkspaceController, 'getAll', [...mid, getAuth0User()]));
routes.get('/workspaces-auth', RouteBuilder.method(WorkspaceController, 'getAll', [...mid, getUser(), rbac]));
routes.post('/workspaces', RouteBuilder.method(WorkspaceController, 'create', [...mid, getAuth0User()]));
routes.get('/workspaces/:id', RouteBuilder.method(WorkspaceController, 'get', [...mid, getUser(), rbac]));
routes.put('/workspaces/:id', RouteBuilder.method(WorkspaceController, 'update', [...mid, getUser(), rbac], {
	rbac: 'workspace',
	rbacAction: 'updateAny',
}));
routes.delete('/workspaces/:id', RouteBuilder.method(WorkspaceController, 'delete', [...mid, getUser(), rbac], {
	rbac: 'workspace',
	rbacAction: 'deleteOwn',
}));

routes.get('/plans/usage', RouteBuilder.method(PlanUsageController, 'getAll', [...mid, getUser(), rbac]));

routes.get('/members', RouteBuilder.method(WorkspaceUsersController, 'getAll', [...mid, getUser(), rbac], {
	rbac: 'member',
	rbacAction: 'readAny',
}));
routes.post('/members', RouteBuilder.method(WorkspaceUsersController, 'invite', [...mid, getUser(), rbac, hasActiveSubscription()], {
	rbac: 'member',
	rbacAction: 'create',
}));
routes.get('/members/me', RouteBuilder.method(WorkspaceUsersController, 'getMe', [...mid, getUser(), rbac], {
	rbac: 'member',
	rbacAction: 'readAny',
}));
routes.get('/members/:id', RouteBuilder.method(WorkspaceUsersController, 'get', [...mid, getUser(), rbac], {
	rbac: 'member',
	rbacAction: 'readAny',
}));
routes.post('/members/:id/actions/resend-invite', RouteBuilder.method(WorkspaceUsersController, 'resendInvite', [...mid, getUser(), rbac, hasActiveSubscription()], {
	rbac: 'member',
	rbacAction: 'create',
}));
routes.put('/members/:id', RouteBuilder.method(WorkspaceUsersController, 'update', [...mid, getUser(), rbac], {
	rbac: 'member',
	rbacAction: 'updateAny',
}));
routes.delete('/members/me', RouteBuilder.method(WorkspaceUsersController, 'leave', [...mid, getUser(), rbac], {
	rbac: 'member',
	rbacAction: 'deleteAny',
}));
routes.delete('/members/:id', RouteBuilder.method(WorkspaceUsersController, 'kick', [...mid, getUser(), rbac], {
	rbac: 'member',
	rbacAction: 'deleteAny',
}));

routes.resource('/personas', RouteBuilder.crud(PersonaController, [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'persona' }));
routes.resource('/interviews', RouteBuilder.crud(InterviewController, [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'interview' }));
routes.resource('/v2/interviews', RouteBuilder.crud(InterviewV2Controller, [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'interviewV2' }));

routes.get('/integrations/info', RouteBuilder.method(IntegrationController, 'info', [...mid, getUser(), rbac, hasActiveSubscription()]));
routes.resource('/integrations', RouteBuilder.crud(IntegrationController, [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'integrations' }));
routes.post('/integrations/:id/actions/test', RouteBuilder.method(IntegrationController, 'test', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'integrations' }));

routes.post('/medias', RouteBuilder.method(MediaController, 'create', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'media' }));
routes.get('/medias/:id', RouteBuilder.method(MediaController, 'get', [...mid, getUser(), rbac], { rbac: 'media' }));
routes.put('/medias/:id', RouteBuilder.method(MediaController, 'update', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'media' }));
routes.post('/medias/:id/actions/upload', RouteBuilder.method(MediaController, 'upload', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'media' }));
routes.post('/medias/:id/actions/complete', RouteBuilder.method(MediaController, 'complete', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'media' }));

routes.get('/onboarding', RouteBuilder.method(OnboardingController, 'getAll', [...mid, getUser(), rbac]));
routes.put('/onboarding/:id', RouteBuilder.method(OnboardingController, 'update', [...mid, getUser(), rbac]));

routes.resource('/tags', RouteBuilder.crud(TagController, [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'tag' }));
routes.get('/tags/:tagPath/items', RouteBuilder.method(TagItemController, 'getAllItemsByTag', [...mid, getUser(), rbac], { rbac: 'tag' }));
routes.get('/tags/items/stats', RouteBuilder.method(TagItemController, 'getAllStatistics', [...mid, getUser(), rbac], { rbac: 'tag' }));
routes.get('/tags/items/:type/:itemId', RouteBuilder.method(TagItemController, 'getAllForItem', [...mid, getUser(), rbac], { rbac: 'tag' }));
routes.post('/tags/items', RouteBuilder.method(TagItemController, 'create', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'tag' }));
routes.delete('/tags/items/:itemTagPath', RouteBuilder.method(TagItemController, 'delete', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'tag' }));

routes.get('/billing', RouteBuilder.method(BillingController, 'getBilling', [...mid, getUser(), rbac], { rbac: 'billing', rbacAction: 'readAny' }));
routes.get('/billing/invoices', RouteBuilder.method(BillingController, 'getBillingInvoices', [...mid, getUser(), rbac], { rbac: 'billing', rbacAction: 'readAny' }));
routes.put('/billing/info', RouteBuilder.method(BillingController, 'updateInfo', [...mid, getUser(), rbac], { rbac: 'billing', rbacAction: 'updateAny' }));
routes.post('/billing/subscription', RouteBuilder.method(BillingController, 'updateSubscription', [...mid, getUser(), rbac], { rbac: 'billing', rbacAction: 'updateAny' }));
routes.delete('/billing/subscription', RouteBuilder.method(BillingController, 'cancelSubscriptionRequest', [...mid, getUser(), rbac], { rbac: 'billing', rbacAction: 'deleteAny' }));

routes.get('/activities', RouteBuilder.method(ActivityController, 'getAll', [...mid, getUser(), rbac]));

routes.post('/webhooks/stripe', RouteBuilder.method(StripeWebhookController, 'handle', [...mid, getStripeContext]));
routes.post('/webhooks/twilio', RouteBuilder.method(TwilioWebhookController, 'handle', [...mid, httpUrlEncodeBodyParser({ extended: false })]));

routes.post('/videoCalls', RouteBuilder.method(VideoCallController, 'create', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'videoCalls' }));
routes.get('/videoCalls/:id', RouteBuilder.method(VideoCallController, 'get', [...mid, getUser(), rbac], { rbac: 'videoCalls' }));
routes.put('/videoCalls/:id', RouteBuilder.method(VideoCallController, 'update', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'videoCalls' }));
routes.delete('/videoCalls/:id', RouteBuilder.method(VideoCallController, 'delete', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'videoCalls' }));
routes.post('/videoCalls/:id/actions/start', RouteBuilder.method(VideoCallController, 'start', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'videoCalls' }));
routes.post('/videoCalls/:id/actions/join', RouteBuilder.method(VideoCallController, 'join', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'videoCalls' }));
routes.post('/videoCalls/:id/actions/end', RouteBuilder.method(VideoCallController, 'end', [...mid, getUser(), rbac, hasActiveSubscription()], { rbac: 'videoCalls' }));

routes.post('/public/videoCalls/:id/actions/get', RouteBuilder.method(VideoCallController, 'getByPublicId', [...mid], { }));
routes.post('/public/videoCalls/:id/actions/join', RouteBuilder.method(VideoCallController, 'joinByPublicId', [...mid], { }));

export default routes.exec();
