// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_failure.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$AuthFailure {





@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AuthFailure);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'AuthFailure()';
}


}

/// @nodoc
class $AuthFailureCopyWith<$Res>  {
$AuthFailureCopyWith(AuthFailure _, $Res Function(AuthFailure) __);
}


/// Adds pattern-matching-related methods to [AuthFailure].
extension AuthFailurePatterns on AuthFailure {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( InvalidCredentialsFailure value)?  invalidCredentials,TResult Function( ValidationFailure value)?  validation,TResult Function( NetworkFailure value)?  network,TResult Function( ServerFailure value)?  server,required TResult orElse(),}){
final _that = this;
switch (_that) {
case InvalidCredentialsFailure() when invalidCredentials != null:
return invalidCredentials(_that);case ValidationFailure() when validation != null:
return validation(_that);case NetworkFailure() when network != null:
return network(_that);case ServerFailure() when server != null:
return server(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( InvalidCredentialsFailure value)  invalidCredentials,required TResult Function( ValidationFailure value)  validation,required TResult Function( NetworkFailure value)  network,required TResult Function( ServerFailure value)  server,}){
final _that = this;
switch (_that) {
case InvalidCredentialsFailure():
return invalidCredentials(_that);case ValidationFailure():
return validation(_that);case NetworkFailure():
return network(_that);case ServerFailure():
return server(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( InvalidCredentialsFailure value)?  invalidCredentials,TResult? Function( ValidationFailure value)?  validation,TResult? Function( NetworkFailure value)?  network,TResult? Function( ServerFailure value)?  server,}){
final _that = this;
switch (_that) {
case InvalidCredentialsFailure() when invalidCredentials != null:
return invalidCredentials(_that);case ValidationFailure() when validation != null:
return validation(_that);case NetworkFailure() when network != null:
return network(_that);case ServerFailure() when server != null:
return server(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function()?  invalidCredentials,TResult Function( String message)?  validation,TResult Function()?  network,TResult Function()?  server,required TResult orElse(),}) {final _that = this;
switch (_that) {
case InvalidCredentialsFailure() when invalidCredentials != null:
return invalidCredentials();case ValidationFailure() when validation != null:
return validation(_that.message);case NetworkFailure() when network != null:
return network();case ServerFailure() when server != null:
return server();case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function()  invalidCredentials,required TResult Function( String message)  validation,required TResult Function()  network,required TResult Function()  server,}) {final _that = this;
switch (_that) {
case InvalidCredentialsFailure():
return invalidCredentials();case ValidationFailure():
return validation(_that.message);case NetworkFailure():
return network();case ServerFailure():
return server();}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function()?  invalidCredentials,TResult? Function( String message)?  validation,TResult? Function()?  network,TResult? Function()?  server,}) {final _that = this;
switch (_that) {
case InvalidCredentialsFailure() when invalidCredentials != null:
return invalidCredentials();case ValidationFailure() when validation != null:
return validation(_that.message);case NetworkFailure() when network != null:
return network();case ServerFailure() when server != null:
return server();case _:
  return null;

}
}

}

/// @nodoc


class InvalidCredentialsFailure implements AuthFailure {
  const InvalidCredentialsFailure();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InvalidCredentialsFailure);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'AuthFailure.invalidCredentials()';
}


}




/// @nodoc


class ValidationFailure implements AuthFailure {
  const ValidationFailure(this.message);
  

 final  String message;

/// Create a copy of AuthFailure
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ValidationFailureCopyWith<ValidationFailure> get copyWith => _$ValidationFailureCopyWithImpl<ValidationFailure>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ValidationFailure&&(identical(other.message, message) || other.message == message));
}


@override
int get hashCode => Object.hash(runtimeType,message);

@override
String toString() {
  return 'AuthFailure.validation(message: $message)';
}


}

/// @nodoc
abstract mixin class $ValidationFailureCopyWith<$Res> implements $AuthFailureCopyWith<$Res> {
  factory $ValidationFailureCopyWith(ValidationFailure value, $Res Function(ValidationFailure) _then) = _$ValidationFailureCopyWithImpl;
@useResult
$Res call({
 String message
});




}
/// @nodoc
class _$ValidationFailureCopyWithImpl<$Res>
    implements $ValidationFailureCopyWith<$Res> {
  _$ValidationFailureCopyWithImpl(this._self, this._then);

  final ValidationFailure _self;
  final $Res Function(ValidationFailure) _then;

/// Create a copy of AuthFailure
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? message = null,}) {
  return _then(ValidationFailure(
null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class NetworkFailure implements AuthFailure {
  const NetworkFailure();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NetworkFailure);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'AuthFailure.network()';
}


}




/// @nodoc


class ServerFailure implements AuthFailure {
  const ServerFailure();
  






@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ServerFailure);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
  return 'AuthFailure.server()';
}


}




// dart format on
