import Legal from '../components/Legal'
import termsMd from '../content/terms.md?raw'

const Terms = () => <Legal title="이용약관" subtitle="Terms of Service" markdown={termsMd} />

export default Terms
