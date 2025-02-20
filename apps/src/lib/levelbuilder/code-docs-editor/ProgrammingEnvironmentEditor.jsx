import React, {useState} from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import color from '@cdo/apps/util/color';
import TextareaWithMarkdownPreview from '@cdo/apps/lib/levelbuilder/TextareaWithMarkdownPreview';
import Button from '@cdo/apps/templates/Button';
import UploadImageDialog from '@cdo/apps/lib/levelbuilder/lesson-editor/UploadImageDialog';
import SaveBar from '@cdo/apps/lib/levelbuilder/SaveBar';
import {navigateToHref} from '@cdo/apps/utils';

const EDITOR_TYPES = ['blockly', 'droplet', 'text'];

const useProgrammingEnvironment = initialProgrammingEnvironment => {
  const [programmingEnvironment, setProgrammingEnvironment] = useState(
    initialProgrammingEnvironment
  );
  const updateProgrammingEnvironment = (key, value) => {
    setProgrammingEnvironment({...programmingEnvironment, [key]: value});
  };

  return [programmingEnvironment, updateProgrammingEnvironment];
};

export default function ProgrammingEnvironmentEditor({
  initialProgrammingEnvironment
}) {
  const {
    name,
    ...remainingProgrammingEnvironment
  } = initialProgrammingEnvironment;
  const [
    programmingEnvironment,
    updateProgrammingEnvironment
  ] = useProgrammingEnvironment(remainingProgrammingEnvironment);
  const [uploadImageDialogOpen, setUploadImageDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const save = () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    fetch(`/programming_environments/${name}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
      },
      body: JSON.stringify(programmingEnvironment)
    })
      .then(response => {
        setIsSaving(false);
        if (response.ok) {
          setLastUpdated(Date.now());
          setError(null);
        } else {
          setError(response.statusText);
        }
      })
      .catch(error => {
        setIsSaving(false);
        setError(error.responseText);
      });
  };

  return (
    <div>
      <h1>{`Editing ${name}`}</h1>
      <h2>
        This feature is in development. Please continue to use curriculum
        builder to edit code documentation.
      </h2>
      <label>
        Title
        <input
          value={programmingEnvironment.title || ''}
          onChange={e => updateProgrammingEnvironment('title', e.target.value)}
          style={styles.textInput}
        />
      </label>
      <label>
        IDE URL (Slug)
        <input value={name} style={styles.textInput} readOnly />
      </label>
      <label>
        How should this document render?
        <select
          value={programmingEnvironment.editorType || EDITOR_TYPES[0]}
          onChange={e =>
            updateProgrammingEnvironment('editorType', e.target.value)
          }
          style={styles.selectInput}
        >
          {EDITOR_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label>
        Image
        <Button
          onClick={() => setUploadImageDialogOpen(true)}
          text="Choose Image"
          color="gray"
          icon="plus-circle"
        />
        {programmingEnvironment.imageUrl && (
          <span>{programmingEnvironment.imageUrl}</span>
        )}
      </label>

      <TextareaWithMarkdownPreview
        markdown={programmingEnvironment.description || ''}
        label={'Description'}
        handleMarkdownChange={e =>
          updateProgrammingEnvironment('description', e.target.value)
        }
        features={{imageUpload: true}}
      />
      <SaveBar
        handleSave={save}
        isSaving={isSaving}
        lastSaved={lastUpdated}
        error={error}
        handleView={() => navigateToHref('/')}
      />
      <UploadImageDialog
        isOpen={uploadImageDialogOpen}
        handleClose={() => setUploadImageDialogOpen(false)}
        uploadImage={imgUrl => updateProgrammingEnvironment('imageUrl', imgUrl)}
        allowExpandable={false}
      />
    </div>
  );
}

ProgrammingEnvironmentEditor.propTypes = {
  initialProgrammingEnvironment: PropTypes.object.isRequired
};

const styles = {
  textInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 6px',
    color: '#555',
    border: `1px solid ${color.bootstrap_border_color}`,
    borderRadius: 4,
    margin: 0
  },
  selectInput: {
    boxSizing: 'border-box',
    padding: '4px 6px',
    color: '#555',
    border: `1px solid ${color.bootstrap_border_color}`,
    borderRadius: 4,
    marginBottom: 0,
    marginLeft: 5
  }
};
