{{/* Image reference. Prefers a digest: a tag can move, a digest cannot, so
     two replicas of the same deployment always run identical code. */}}
{{- define "moat.image" -}}
{{- $img := index .root.Values.image .component -}}
{{- if $img.digest -}}
{{ .root.Values.global.imageRegistry }}/{{ $img.repository }}@{{ $img.digest }}
{{- else -}}
{{ .root.Values.global.imageRegistry }}/{{ $img.repository }}:{{ $img.tag }}
{{- end -}}
{{- end -}}

{{- define "moat.labels" -}}
app.kubernetes.io/name: moat
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/* Shared security posture. Applied to every workload: no privilege
     escalation, read-only root filesystem, all capabilities dropped. */}}
{{- define "moat.securityContext" -}}
runAsNonRoot: true
runAsUser: 10001
runAsGroup: 10001
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: ["ALL"]
seccompProfile:
  type: RuntimeDefault
{{- end -}}

{{/* Spread replicas across zones so losing one zone cannot take a whole
     deployment with it. ScheduleAnyway, not DoNotSchedule: during a zone
     outage, an unschedulable pod is worse than an unbalanced one. */}}
{{- define "moat.topologySpread" -}}
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway
  labelSelector:
    matchLabels:
      app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "moat.env" -}}
- name: MOAT_ENV
  value: {{ .Values.global.environment | quote }}
- name: MOAT_DATABASE_DSN
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.database }}, key: pooled-dsn }
- name: MOAT_MIGRATION_DSN
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.database }}, key: owner-dsn }
- name: MOAT_SESSION_SECRET
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.session }}, key: secret }
- name: MOAT_S3_ACCESS_KEY
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.objectStore }}, key: access-key }
- name: MOAT_S3_SECRET_KEY
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.objectStore }}, key: secret-key }
- name: MOAT_OIDC_CLIENT_SECRET
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.identity }}, key: client-secret }
- name: MOAT_AUTH_MODE
  value: "oidc"
- name: MOAT_COOKIE_SECURE
  value: "true"
- name: MOAT_OPENSEARCH_URL
  value: "http://{{ .Release.Name }}-opensearch:9200"
- name: MOAT_S3_ENDPOINT
  value: "http://{{ .Release.Name }}-seaweedfs-s3:8333"
- name: MOAT_TEMPORAL_ADDRESS
  value: "{{ .Release.Name }}-temporal-frontend:7233"
- name: MOAT_WEB_ORIGIN
  value: "https://{{ .Values.gateway.hostname }}"
- name: MOAT_OTEL_ENABLED
  value: "true"
- name: MOAT_OTEL_ENDPOINT
  value: "http://opentelemetry-collector.observability:4317"
{{- end -}}
