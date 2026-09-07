import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const MODULOS = {
  toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']],
}

export default function EditorRico({ value, onChange, placeholder }) {
  return (
    <div className="rich-editor">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={MODULOS} placeholder={placeholder} />
    </div>
  )
}
