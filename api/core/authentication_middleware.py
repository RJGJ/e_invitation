from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken, TokenError


class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.auth = JWTAuthentication()

    def __call__(self, request):
        try:
            result = self.auth.authenticate(request)
            if result is not None:
                request.user, _ = result
        except (InvalidToken, AuthenticationFailed, TokenError):
            pass
        return self.get_response(request)
