import Legal from '../components/Legal'
import privacyMd from '../content/privacy.md?raw'

const Privacy = () => (
  <Legal title="개인정보처리방침" subtitle="Privacy Policy" markdown={privacyMd} />
)

export default Privacy
