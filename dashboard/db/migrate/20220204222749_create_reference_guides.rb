class CreateReferenceGuides < ActiveRecord::Migration[5.2]
  def change
    create_table :reference_guides do |t|
      t.string :key
      t.bigint :course_version_id
      t.bigint :parent_reference_guide_id
      t.string :display_name
      t.text :content
      t.integer :position

      t.timestamps
    end
    add_index :reference_guides, :key
    add_index :reference_guides, :course_version_id
  end
end
