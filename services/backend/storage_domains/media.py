import uuid

from peewee import DoesNotExist

from ..models import MediaRecord, MediaUpload


class MediaMixin:
    def prepare_media_upload(self, user_id, payload):
        media_id = f"media-{uuid.uuid4().hex[:12]}"
        upload_token = f"upload-{uuid.uuid4().hex[:12]}"
        remote_url = f"/api/media/files/{media_id}"
        
        MediaRecord.create(
            id=media_id,
            user_id=user_id,
            mimeType=payload.get('mimeType') or 'application/octet-stream',
            fileName=payload.get('fileName') or '',
            contentBase64='',
            remoteUrl=remote_url
        )
        
        MediaUpload.create(
            token=upload_token,
            media_id=media_id,
            user_id=user_id,
            status='prepared'
        )
        
        return {
            'token': upload_token,
            'mediaId': media_id,
            'uploadUrl': f"/api/media/upload/{upload_token}",
            'remoteUrl': remote_url
        }

    def upload_media_content(self, user_id, token, payload):
        content_base64 = str(payload.get('contentBase64') or '').strip()
        if not content_base64:
            raise ValueError('MEDIA_CONTENT_REQUIRED')

        try:
            upload = MediaUpload.get(MediaUpload.token == token)
        except DoesNotExist:
            raise LookupError('MEDIA_UPLOAD_NOT_FOUND')
            
        if upload.user_id != user_id:
            raise PermissionError('MEDIA_UPLOAD_FORBIDDEN')

        try:
            record = MediaRecord.get(MediaRecord.id == upload.media_id)
        except DoesNotExist:
            raise LookupError('MEDIA_NOT_FOUND')

        record.contentBase64 = content_base64
        record.save()
        
        upload.status = 'uploaded'
        upload.save()
        
        return {
            'id': record.id,
            'remoteUrl': record.remoteUrl,
            'mimeType': record.mimeType,
            'fileName': record.fileName
        }

    def get_media_file(self, media_id):
        try:
            record = MediaRecord.get(MediaRecord.id == media_id)
            if not record.contentBase64:
                raise LookupError('MEDIA_NOT_FOUND')
                
            return {
                'mimeType': record.mimeType or 'application/octet-stream',
                'contentBase64': record.contentBase64
            }
        except DoesNotExist:
            raise LookupError('MEDIA_NOT_FOUND')
