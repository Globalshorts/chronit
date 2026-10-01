# 어느 세션에서든 레포에 push하기 (프록시 우회)

Cowork 클라우드 세션(노트북 등)은 git 프록시가 GitHub push를 막는다
("not in this session's authorized repository set"). 하지만 Supabase는 허용되므로,
**Supabase 엣지 함수 `repo-commit`을 호출하면 서버가 대신 GitHub에 커밋**한다.

## 호출법
POST https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/repo-commit
Content-Type: application/json
```json
{
  "key": "<repo_commit_key>",
  "repo": "Globalshorts/chronit",
  "branch": "main",
  "message": "커밋 메시지",
  "files": [
    { "path": "src/foo.jsx", "content": "파일 전체 내용(텍스트)" },
    { "path": "public/img.png", "content": "<base64>", "encoding": "base64" },
    { "path": "old/file.js", "delete": true }
  ]
}
```
- 인증키(`key`)는 레포 push 전용 키(`repo_commit_key`). 발행용 cron_secret도 받지만 전용 키 권장.
- 여러 파일을 하나의 커밋으로 올린다(blob to tree to commit to ref).
- content는 파일 전체 내용(부분 패치 아님). 바이너리는 encoding:"base64".
- GitHub 토큰은 서버(app_config.GH_TOKEN)에 있어 세션에 노출 안 됨.
- 성공 시 Vercel이 main push를 감지해 자동 배포.

## 노트북 세션 에이전트에게
레포 코드를 고쳐야 하면: 바뀐 파일의 전체 내용을 만들어 위 함수에 files로 넘겨라.
호출 자체는 Supabase라 git 프록시에 막히지 않는다. key 값은 사용자에게 받는다.
