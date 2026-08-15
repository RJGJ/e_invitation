def require_auth(info):
    user = info.context.request.user
    if not user.is_authenticated:
        raise Exception("Authentication required")
    return user


def require_owner_or_admin(info, obj, owner_field):
    user = require_auth(info)
    owner_id = getattr(obj, f"{owner_field}_id")
    if owner_id != user.id and not user.is_admin:
        raise Exception("Permission denied")
    return user
